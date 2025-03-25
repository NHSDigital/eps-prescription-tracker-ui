import {Stack} from "aws-cdk-lib"
import {CfnIdentityPool, CfnIdentityPoolRoleAttachment} from "aws-cdk-lib/aws-cognito"
import {
  FederatedPrincipal,
  ManagedPolicy,
  PolicyStatement,
  Role
} from "aws-cdk-lib/aws-iam"
import {CfnAppMonitor} from "aws-cdk-lib/aws-rum"
import {Construct} from "constructs"

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

}
export class Rum extends Construct {
  public readonly unauthenticatedRumRole: Role
  public readonly identityPool: CfnIdentityPool
  public readonly rumApp: CfnAppMonitor
  public readonly baseAppMonitorConfiguration: CfnAppMonitor.AppMonitorConfigurationProperty

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

    // using an L1 construct as no L2 construct available for RUM
    // TODO - add javascript source maps property when it is available in CF/CDK (feature released 18 March 2025)
    // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-JavaScriptStackTraceSourceMaps.html
    const baseAppMonitorConfiguration: CfnAppMonitor.AppMonitorConfigurationProperty = {
      allowCookies: true,
      enableXRay: true,
      sessionSampleRate: 1, // this means 100%
      telemetries: ["errors", "performance", "http"],
      identityPoolId: identityPool.ref,
      guestRoleArn: unauthenticatedRumRole.roleArn
    }
    const rumApp = new CfnAppMonitor(this, "RumAppMonitor", {
      name: props.appMonitorName,
      cwLogEnabled: true,
      domain: props.topLevelDomain,
      appMonitorConfiguration: {
        ...baseAppMonitorConfiguration
      }
    })

    this.identityPool = identityPool
    this.rumApp = rumApp
    this.unauthenticatedRumRole = unauthenticatedRumRole
    this.baseAppMonitorConfiguration = baseAppMonitorConfiguration
  }

}
