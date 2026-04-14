import {Fn, Stack} from "aws-cdk-lib"
import {CfnIdentityPool, CfnIdentityPoolRoleAttachment} from "aws-cdk-lib/aws-cognito"
import {
  FederatedPrincipal,
  IRole,
  ManagedPolicy,
  PolicyStatement,
  Role
} from "aws-cdk-lib/aws-iam"
import {CfnAppMonitor} from "aws-cdk-lib/aws-rum"
import {Construct} from "constructs"
import {RumLog} from "./RumLog"
import {IBucket} from "aws-cdk-lib/aws-s3"

export interface RumProps {
  /**
   * Provide a domain that will be allowed to send telemetry data to the
   * Realtime User Monitoring (RUM) agent
   */
  readonly topLevelDomain: string;
  readonly serviceName: string;
  readonly logRetentionInDays: number
  readonly cwLogEnabled: boolean
  readonly allowLocalhostAccess: boolean
  readonly staticContentBucket: IBucket
}

export class Rum extends Construct {
  public readonly rumApp: CfnAppMonitor
  public readonly guestRole: IRole
  public readonly identityPool: CfnIdentityPool

  constructor(scope: Construct, id: string, props: RumProps) {
    super(scope, id)

    // use L1 construct as currently no stable L2 construct for identity pool
    this.identityPool = new CfnIdentityPool(this, "RumAppIdentityPool", {
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
              resourceName: props.serviceName
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
    this.guestRole = new Role(this, "UnauthenticatedRumRole", {
      assumedBy: new FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref
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
      identityPoolId: this.identityPool.ref,
      roles: {
        unauthenticated: this.guestRole.roleArn
      }
    })

    // using an L1 construct as no L2 construct available for RUM
    // need two deployments here as we can only enable cwLog when we have a log group
    // and the log group name is based on the id of this resource
    const allowedDomains = [props.topLevelDomain]
    if (props.allowLocalhostAccess) {
      allowedDomains.push("localhost")
    }
    this.rumApp = new CfnAppMonitor(this, "RumApp", {
      name: props.serviceName,
      cwLogEnabled: props.cwLogEnabled,
      domainList: allowedDomains,
      deobfuscationConfiguration: {
        javaScriptSourceMaps: {
          status: "ENABLED",
          s3Uri: `s3://${props.staticContentBucket.bucketName}/source_maps`
        }
      },
      appMonitorConfiguration: {
        allowCookies: true,
        enableXRay: true,
        sessionSampleRate: 1, // this means 100%
        telemetries: ["errors", "performance"],
        identityPoolId: this.identityPool.ref,
        guestRoleArn: this.guestRole.roleArn
      },
      customEvents: {
        status: "ENABLED"
      }
    })

    // calculate the log group for rum events
    // this is /aws/vendedlogs/RUMService_<RUM APP NAME><FIRST 8 CHARS OF THE RUM APP ID>
    // use Fn.split and Fn.select to force it to use cloudformation intrinsic functions so its calculated at deploy time
    const splitRumAppId = Fn.split("-", this.rumApp.attrId)
    const startOfRumAppId = Fn.select(0, splitRumAppId)
    const logGroupName = `RUMService_${props.serviceName}${startOfRumAppId}`
    new RumLog(this, "RumLog", {
      rumLogGroupName: logGroupName,
      logRetentionInDays: props.logRetentionInDays
    })
  }

}
