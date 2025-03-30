import {Fn, Stack} from "aws-cdk-lib"
import {CfnIdentityPool, CfnIdentityPoolRoleAttachment} from "aws-cdk-lib/aws-cognito"
import {
  FederatedPrincipal,
  ManagedPolicy,
  PolicyStatement,
  Role
} from "aws-cdk-lib/aws-iam"
import {CfnAppMonitor} from "aws-cdk-lib/aws-rum"
import {Construct} from "constructs"
import {RumLog} from "./RumLog"
import {LogGroup} from "aws-cdk-lib/aws-logs"
import {IBucket} from "aws-cdk-lib/aws-s3"

export interface RumProps {
  /**
   * Provide a domain that will be allowed to send telemetry data to the
   * Realtime User Monitoring (RUM) agent
   */
  readonly topLevelDomain: string;
  /**
   * The name for the App Monitor that will be created
   *
   * @unique
   */
  readonly appMonitorName: string;
  readonly serviceName: string;
  readonly stackName: string;
  readonly logRetentionInDays: number
  readonly cwLogEnabled: boolean
  readonly allowLocalhostAccess: boolean
  readonly staticContentBucket: IBucket

}
export class Rum extends Construct {
  public readonly unauthenticatedRumRole: Role
  public readonly identityPool: CfnIdentityPool
  public readonly rumApp: CfnAppMonitor
  public readonly baseAppMonitorConfiguration: CfnAppMonitor.AppMonitorConfigurationProperty
  public readonly logGroup: LogGroup

  constructor(scope: Construct, id: string, props: RumProps) {
    super(scope, id)

    // use L1 construct as currently no stable L2 construct for identity pool
    const identityPool = new CfnIdentityPool(this, "RumAppIdentityPool", {
      allowUnauthenticatedIdentities: true
    })

    // policies to allow to put to rum event
    const unauthenticatedRumRolePolicies = new ManagedPolicy(this, "unauthenticatedRumRolePolicies", {
      statements: [
        new PolicyStatement({
          actions: ["rum:PutRumEvents"],
          resources: [
            Stack.of(this).formatArn({
              service: "rum",
              resource: "appmonitor",
              resourceName: props.appMonitorName
            })
          ]
        }),
        new PolicyStatement({
          actions: ["xray:PutTraceSegments"],
          resources: ["*"]
        })
      ]
    })

    // role assumed by cognito to post to rum
    const unauthenticatedRumRole = new Role(this, "UnauthenticatedRumRole", {
      assumedBy: new FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated"
          }
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      managedPolicies: [
        unauthenticatedRumRolePolicies
      ]
    })

    // attach the role to the identity pool
    new CfnIdentityPoolRoleAttachment(this, "RumAppRoleAttachment", {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthenticatedRumRole.roleArn
      }
    })

    const baseAppMonitorConfiguration: CfnAppMonitor.AppMonitorConfigurationProperty = {
      allowCookies: true,
      enableXRay: true,
      sessionSampleRate: 1, // this means 100%
      telemetries: ["errors", "performance", "http"],
      identityPoolId: identityPool.ref,
      guestRoleArn: unauthenticatedRumRole.roleArn
    }
    // using an L1 construct as no L2 construct available for RUM
    // this is another 'must do two deployments' as we can only enable cwLog when we have a log group
    // and the log group name is based on the id of this resource
    const allowedDomains = [props.topLevelDomain]
    if (props.allowLocalhostAccess) {
      allowedDomains.push("localhost")
    }
    const rumApp = new CfnAppMonitor(this, "RumApp", {
      name: props.appMonitorName,
      cwLogEnabled: props.cwLogEnabled,
      domainList: allowedDomains,
      deobfuscationConfiguration: {
        javaScriptSourceMaps: {
          status: "ENABLED",
          s3Uri: `s3://${props.staticContentBucket.bucketName}/source_maps/`
        }
      },
      appMonitorConfiguration: {
        ...baseAppMonitorConfiguration
      }
    })

    // calculate the log group for rum events
    // this is /aws/vendedlogs/RUMService_<RUM APP NAME><FIRST 8 CHARS OF THE RUM APP ID>
    // use Fn.split and Fn.select to force it to use cloudformation intrinsic functions so its calculated at deploy time
    const splitRumAppId = Fn.split("-", rumApp.attrId)
    const startOfRumAppId = Fn.select(0, splitRumAppId)
    const logGroupName = `RUMService_${props.appMonitorName}${startOfRumAppId}`

    const logGroup = new RumLog(this, "RumLog", {
      rumLogGroupName: logGroupName,
      logRetentionInDays: props.logRetentionInDays
    })

    this.identityPool = identityPool
    this.rumApp = rumApp
    this.unauthenticatedRumRole = unauthenticatedRumRole
    this.baseAppMonitorConfiguration = baseAppMonitorConfiguration
    this.logGroup = logGroup.logGroup
  }

}
