import {
  Stack,
  CustomResource,
  Fn,
  RemovalPolicy
} from "aws-cdk-lib"
import {CfnIdentityPool, CfnIdentityPoolRoleAttachment} from "aws-cdk-lib/aws-cognito"
import {
  FederatedPrincipal,
  ManagedPolicy,
  PolicyStatement,
  Role
} from "aws-cdk-lib/aws-iam"
import {CfnAppMonitor} from "aws-cdk-lib/aws-rum"
import {IBucket} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"
import {LambdaFunction} from "./LambdaFunction"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {IKey, Key} from "aws-cdk-lib/aws-kms"
import {CfnLogGroup, CfnSubscriptionFilter, LogGroup} from "aws-cdk-lib/aws-logs"

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
  readonly s3Bucket: IBucket;
  readonly s3BucketKmsKey: IKey
  readonly serviceName: string;
  readonly stackName: string;
  readonly logRetentionInDays: number
  readonly logLevel: string

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

  constructor(scope: Construct, id: string, props: RumProps) {
    super(scope, id)

    const cloudWatchLogsKmsKey = Key.fromKeyArn(
      this, "cloudWatchLogsKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))

    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    const rumLogGroup = new LogGroup(this, "RumLogGroup", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/rum/${props.appMonitorName!}`,
      retention: props.logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })

    const cfnlambdaLogGroup = rumLogGroup.node.defaultChild as CfnLogGroup
    cfnlambdaLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rumLogGroupManagedPolicy = new ManagedPolicy(this, "LambdaPutLogsManagedPolicy", {
      description: `write to ${props.appMonitorName} logs`,
      statements: [
        new PolicyStatement({
          actions: [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          resources: [
            rumLogGroup.logGroupArn,
            `${rumLogGroup.logGroupArn}:log-stream:*`
          ]
        })]
    })

    new CfnSubscriptionFilter(this, "CoordinatorSplunkSubscriptionFilter", {
      destinationArn: splunkDeliveryStream.streamArn,
      filterPattern: "",
      logGroupName: rumLogGroup.logGroupName,
      roleArn: splunkSubscriptionFilterRole.roleArn
    })

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

    const uploadRumPolicies = new ManagedPolicy(this, "uploadFilePolicy", {
      statements: [
        new PolicyStatement({
          actions: ["s3:PutObject*", "s3:DeleteObject*"],
          resources: [`${props.s3Bucket.bucketArn}/rum.js`]
        }),
        new PolicyStatement({
          actions: ["kms:Encrypt", "kms:GenerateDataKey"],
          resources: [
            props.s3BucketKmsKey.keyArn
          ]
        }),
        new PolicyStatement({
          actions: ["rum:GetAppMonitor"],
          resources: [
            Stack.of(this).formatArn({
              service: "rum",
              resource: "appmonitor",
              resourceName: props.appMonitorName
            })]
        })
      ]
    })

    const uploadRum = new LambdaFunction(this, "uploadRum", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-uploadRum`,
      additionalPolicies: [uploadRumPolicies],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/uploadRum",
      entryPoint: "src/handler.ts",
      //TODO - handle no environment variables passed through
      lambdaEnvironmentVariables: {foo: "bar"}
    })

    // using an L1 construct as no L2 construct available for RUM
    const baseAppMonitorConfiguration = {
      allowCookies: true,
      enableXRay: true,
      sessionSampleRate: 1,
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

    const uploadRumScriptToWebsiteBucket = new CustomResource(this, "UploadRumScriptToWebsiteBucket", {
      serviceToken: uploadRum.lambda.functionArn,
      properties: {
        s3BucketName: props.s3Bucket.bucketName,
        appMonitorName: props.appMonitorName,
        appMonitorConfiguration: baseAppMonitorConfiguration,
        // The CDK needs to always upload the rum, otherwise the new web
        // deployment erases the file.
        trigger: Date.now()
      }
    })
    uploadRumScriptToWebsiteBucket.node.addDependency(uploadRum.lambda)

    this.identityPool = identityPool
    this.rumApp = rumApp
    this.unauthenticatedRumRole = unauthenticatedRumRole
  }

}
