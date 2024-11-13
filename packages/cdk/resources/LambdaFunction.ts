import {
  IManagedPolicy,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {
  LogGroup,
  CfnLogGroup,
  SubscriptionFilter,
  FilterPattern
} from "aws-cdk-lib/aws-logs"
import {CfnFunction, LayerVersion} from "aws-cdk-lib/aws-lambda"
import {KinesisDestination} from "aws-cdk-lib/aws-logs-destinations"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {Construct} from "constructs"

import {getDefaultLambdaOptions} from "./LambdaFunction/helpers"
import path from "path"

const insightsLayerArn = "arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension:53"

export interface LambdaFunctionProps {
  /**
   * The name of the service the Lambda function belongs to.
   */
  readonly serviceName: string

  /**
   * The name of the stack deploying this Lambda function.
   */
  readonly stackName: string

  /**
   * The name of the Lambda function.
   */
  readonly lambdaName: string

  /**
   * Additional IAM Managed Policies to attach to the Lambda execution role.
   */
  readonly additionalPolicies?: Array<IManagedPolicy>

  /**
   * The base path of the Lambda function code package.
   * Relative to the root of the repository, e.g. "packages/cdk/resources/TrackerUserInfo"
   */
  readonly packageBasePath: string

  /**
   * The entry point file of the Lambda function.
   */
  readonly entryPoint: string

  /**
   * Environment variables to set in the Lambda function.
   */
  readonly lambdaEnvironmentVariables: { [key: string]: string }
}

/**
 * A CDK Construct that creates a Node.js AWS Lambda function along with all the necessary
 * AWS resources and configurations required for logging, monitoring, and permissions.
 *
 * This construct sets up:
 * - A Lambda function using the provided code and configuration.
 * - A CloudWatch Log Group for the Lambda function with encryption and retention policies.
 * - IAM Roles and Policies required for the Lambda function to execute and log properly.
 * - A Kinesis subscription filter to send logs to a Splunk delivery stream.
 * - Integration with AWS Lambda Insights for enhanced monitoring.
 *
 * ### Example:
 * ```typescript
 * new LambdaFunction(this, "MyLambdaFunction", {
 *   serviceName: "my-service",
 *   stackName: "my-stack",
 *   lambdaName: "my-lambda-function",
 *   packageBasePath: "./src",
 *   entryPoint: "index.ts",
 *   lambdaEnvironmentVariables: {
 *     KEY: "value",
 *   },
 *   additionalPolicies: [
 *     // Add any additional managed policies required
 *   ],
 * })
 * ```
 */
export class LambdaFunction extends Construct {
  /**
   * A Managed Policy that allows invoking the Lambda function.
   */
  public readonly executeLambdaManagedPolicy: ManagedPolicy

  /**
   * The AWS CDK construct representing the Lambda function.
   */
  public readonly lambda: NodejsFunction

  /**
   * Constructs a new instance of the LambdaFunction.
   *
   * @param scope The scope in which this construct is defined.
   * @param id The scoped construct ID. Must be unique amongst siblings.
   *           If the ID includes a path separator (/), then it will be replaced by double dash --
   * @param props Configuration properties for the Lambda function.
   */
  public constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id)

    // Context
    // Retrieve the log retention period from context, ensuring it"s a number
    const logRetentionInDays: number = Number(this.node.tryGetContext("logRetentionInDays"))

    // Imports
    const cloudWatchLogsKmsKey = Key.fromKeyArn(
      this, "cloudWatchLogsKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))

    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    const lambdaInsightsLogGroupPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "lambdaInsightsLogGroupPolicy", Fn.importValue("lambda-resources:LambdaInsightsLogGroupPolicy"))

    const cloudwatchEncryptionKMSPolicyArn = ManagedPolicy.fromManagedPolicyArn(
      this, "cloudwatchEncryptionKMSPolicyArn", Fn.importValue("account-resources:CloudwatchEncryptionKMSPolicyArn"))

    const lambdaDecryptSecretsKMSPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "lambdaDecryptSecretsKMSPolicy", Fn.importValue("account-resources:LambdaDecryptSecretsKMSPolicy"))

    const insightsLambdaLayer = LayerVersion.fromLayerVersionArn(
      this, "LayerFromArn", insightsLayerArn)

    // Resources
    // Create a CloudWatch Log Group for the Lambda function with encryption and retention policies
    const lambdaLogGroup = new LogGroup(this, "LambdaLogGroup", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/lambda/${props.lambdaName!}`,
      retention: logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })

    // Suppress specific AWS Config rules for the Log Group
    const cfnlambdaLogGroup = lambdaLogGroup.node.defaultChild as CfnLogGroup
    cfnlambdaLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    // Create a Managed Policy that allows the Lambda function to write logs to the Log Group
    const lambdaManagedPolicy = new ManagedPolicy(
      this,
      "LambdaPutLogsManagedPolicy",
      {
        description: `write to ${props.lambdaName} logs`,
        statements: [
          new PolicyStatement({
            actions: [
              "logs:CreateLogStream",
              "logs:PutLogEvents"
            ],
            resources: [
              lambdaLogGroup.logGroupArn,
              `${lambdaLogGroup.logGroupArn}:log-stream:*`
            ]
          })
        ]
      }
    )

    new SubscriptionFilter(this, "LambdaLogsSplunkSubscriptionFilter", {
      logGroup: lambdaLogGroup,
      filterPattern: FilterPattern.allTerms(),
      destination: new KinesisDestination(splunkDeliveryStream, {
        role: splunkSubscriptionFilterRole
      })
    })

    // Create an IAM Role for the Lambda function with necessary policies
    const lambdaRole = new Role(this, "LambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        lambdaManagedPolicy,
        lambdaInsightsLogGroupPolicy,
        cloudwatchEncryptionKMSPolicyArn,
        lambdaDecryptSecretsKMSPolicy,
        ...(props.additionalPolicies ?? [])
      ]
    })

    const lambdaOptions = getDefaultLambdaOptions({
      functionName: `${props.serviceName}-${props.lambdaName}`,
      packageBasePath: props.packageBasePath,
      entryPoint: props.entryPoint
    })

    // Include the tsconfig in the build
    const bundlingOptions = {
      tsconfig: path.resolve(__dirname, "../tsconfig.json")
    }

    const lambdaFunction = new NodejsFunction(this, props.lambdaName, {
      ...lambdaOptions,
      role: lambdaRole,
      environment: props.lambdaEnvironmentVariables,
      logGroup: lambdaLogGroup,
      layers: [
        insightsLambdaLayer
      ],
      bundling: bundlingOptions
    })

    // Suppress specific AWS Config rules for the Lambda function
    const cfnLambda = lambdaFunction.node.defaultChild as CfnFunction
    cfnLambda.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "LAMBDA_DLQ_CHECK",
          "LAMBDA_INSIDE_VPC",
          "LAMBDA_CONCURRENCY_CHECK"
        ]
      }
    }

    // Create a Managed Policy that allows invoking the Lambda function
    const executeLambdaManagedPolicy = new ManagedPolicy(
      this,
      "ExecuteLambdaManagedPolicy",
      {
        description: `execute lambda ${props.lambdaName}`,
        statements: [
          new PolicyStatement({
            actions: ["lambda:InvokeFunction"],
            resources: [lambdaFunction.functionArn]
          })
        ]
      }
    )

    // Outputs
    this.lambda = lambdaFunction
    this.executeLambdaManagedPolicy = executeLambdaManagedPolicy
  }
}
