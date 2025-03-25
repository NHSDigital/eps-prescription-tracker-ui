import {Fn, RemovalPolicy, Stack} from "aws-cdk-lib"
import {CfnIdentityPool, CfnIdentityPoolRoleAttachment} from "aws-cdk-lib/aws-cognito"
import {
  FederatedPrincipal,
  ManagedPolicy,
  PolicyStatement,
  Role
} from "aws-cdk-lib/aws-iam"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {Key} from "aws-cdk-lib/aws-kms"
import {CfnLogGroup, CfnSubscriptionFilter, LogGroup} from "aws-cdk-lib/aws-logs"
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
  readonly logRetentionInDays: number

}
export class Rum extends Construct {
  public readonly unauthenticatedRumRole: Role
  public readonly identityPool: CfnIdentityPool
  public readonly rumApp: CfnAppMonitor
  public readonly baseAppMonitorConfiguration: CfnAppMonitor.AppMonitorConfigurationProperty
  public readonly logGroup: LogGroup

  constructor(scope: Construct, id: string, props: RumProps) {
    super(scope, id)

    // Imports
    // These are imported here rather than at stack level as they are all imports from account-resources stacks
    const cloudWatchLogsKmsKey = Key.fromKeyArn(
      this, "cloudWatchLogsKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))
    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    // Resources

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
    const rumApp = new CfnAppMonitor(this, "RumApp", {
      name: props.appMonitorName,
      cwLogEnabled: false, // figure out how to change this based on if log exists
      domain: props.topLevelDomain,
      appMonitorConfiguration: {
        ...baseAppMonitorConfiguration
      }
    })

    // log group for rum events
    // note - name is /aws/vendedlogs/<RUM APP NAME><FIRST 8 CHARS OF THE RUM APP ID>
    const rumLogGroup = new LogGroup(this, "RumLogGroup", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/vendedlogs/${props.appMonitorName}${rumApp.attrId.substring(0, 8)}`,
      retention: props.logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })
    // force a dependency as the name is based on rum app id
    rumLogGroup.node.addDependency(rumApp)

    const cfnlambdaLogGroup = rumLogGroup.node.defaultChild as CfnLogGroup
    cfnlambdaLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    new CfnSubscriptionFilter(this, "CoordinatorSplunkSubscriptionFilter", {
      destinationArn: splunkDeliveryStream.streamArn,
      filterPattern: "",
      logGroupName: rumLogGroup.logGroupName,
      roleArn: splunkSubscriptionFilterRole.roleArn
    })

    this.identityPool = identityPool
    this.rumApp = rumApp
    this.unauthenticatedRumRole = unauthenticatedRumRole
    this.baseAppMonitorConfiguration = baseAppMonitorConfiguration
    this.logGroup = rumLogGroup
  }

}
