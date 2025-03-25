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
   * Provide a domain that will be allowed to send telemetry data to the Real
   * User Monitoring agent
   */
  readonly topLevelDomain: string;
  /**
   * The name for the App Monitor that will be created
   *
   * @unique
   */
  readonly appMonitorName: string;
  /**
   * The s3 bucket that the rum script will be uploaded into after creation. This
   * should be accessible to the website, either by using the s3 origin bucket,
   * or by attaching a Cross-Origin Resource Sharing policy to the target bucket.
   */
  readonly serviceName: string;
  readonly stackName: string;

}

/**
 * The RUM custom resource can be used to setup Real User Monitoring using AWS
 *
 * The resource itself creates all the required infrastructure.
 *
 * A Cloudformation custom resource uploads the rum script to the s3 bucket that
 * the website is deployed to
 *
 * @example
 * const rum = new Rum(this, "SiteRum", {
 *   topLevelDomain: "*.s3-website-eu-west-1.amazonaws.com",
 *   appMonitorName: "canary-stack-rum",
 *   s3Bucket: websiteBucket,
 * });
 *
 */
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

    new CfnIdentityPoolRoleAttachment(this, "RumAppRoleAttachment", {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthenticatedRumRole.roleArn
      }
    })

    // using an L1 construct as no L2 construct available for RUM
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
