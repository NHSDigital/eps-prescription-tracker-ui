import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import * as kms from "aws-cdk-lib/aws-kms"
import * as lambda from "aws-cdk-lib/aws-lambda"
import {Construct} from "constructs"

import {getDefaultLambdaOptions} from "./helpers"

const insightsLayerArn = "arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension:53"

export interface FunctionConstructProps {
  readonly stackName: string;
  readonly lambdaName: string;
  readonly additionalPolicies?: Array<iam.IManagedPolicy>;
  readonly logRetentionInDays: number;
  readonly packageBasePath: string;
  readonly entryPoint: string;
  readonly lambdaEnvironmentVariables: { [key: string]: string; }
}

/**
 * Resources for a lambda

 */
export class FunctionConstruct extends Construct {
  public readonly executeLambdaManagedPolicy: iam.ManagedPolicy
  public readonly lambda: nodeLambda.NodejsFunction

  public constructor(scope: Construct, id: string, props: FunctionConstructProps) {
    super(scope, id)

    // Resources

    const cloudWatchLogsKmsKey = kms.Key.fromKeyArn(
      this,
      "cloudWatchLogsKmsKey",
      cdk.Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn")
    )
    const lambdaLogGroup = new logs.LogGroup(this, "LambdaLogGroup", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/lambda/${props.lambdaName!}`,
      retention: props.logRetentionInDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    const cfnlambdaLogGroup = lambdaLogGroup.node.defaultChild as logs.CfnLogGroup
    cfnlambdaLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    const lambdaManagedPolicy = new iam.ManagedPolicy(this, `Execute${props.lambdaName}ManagedPolicy`, {
      description: `write to ${props.lambdaName} logs`,
      statements: [
        new iam.PolicyStatement({
          actions: [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          resources: [
            lambdaLogGroup.logGroupArn,
            `${lambdaLogGroup.logGroupArn}:log-stream:*`
          ]
        })]
    })

    new logs.CfnSubscriptionFilter(this, "LambdaSplunkSubscriptionFilter", {
      roleArn: cdk.Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"),
      logGroupName: lambdaLogGroup.logGroupName,
      filterPattern: "",
      destinationArn: cdk.Fn.importValue("lambda-resources:SplunkDeliveryStream")
    })

    const lambdaInsightsLogGroupPolicy = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      "lambdaInsightsLogGroupPolicy",
      cdk.Fn.importValue("lambda-resources:LambdaInsightsLogGroupPolicy")
    )

    const cloudwatchEncryptionKMSPolicyArn = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      "cloudwatchEncryptionKMSPolicyArn",
      cdk.Fn.importValue("account-resources:CloudwatchEncryptionKMSPolicyArn")
    )
    const lambdaDecryptSecretsKMSPolicy = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      "lambdaDecryptSecretsKMSPolicy",
      cdk.Fn.importValue("account-resources:LambdaDecryptSecretsKMSPolicy")
    )
    const lambdaRole = new iam.Role(this, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        lambdaManagedPolicy,
        lambdaInsightsLogGroupPolicy,
        cloudwatchEncryptionKMSPolicyArn,
        lambdaDecryptSecretsKMSPolicy,
        ...(props.additionalPolicies ?? [])
      ]
    })

    const lambdaOptions = getDefaultLambdaOptions({
      functionName: `${props.stackName}-${props.lambdaName}`,
      packageBasePath: props.packageBasePath,
      entryPoint: props.entryPoint
    })

    const insightsLambdaLayer = lambda.LayerVersion.fromLayerVersionArn(this, "LayerFromArn", insightsLayerArn)
    const lambdaFunction = new nodeLambda.NodejsFunction(this, props.lambdaName, {
      ...lambdaOptions,
      role: lambdaRole,
      environment: props.lambdaEnvironmentVariables,
      logGroup: lambdaLogGroup,
      layers: [
        insightsLambdaLayer
      ]
    })

    const cfnLambda = lambdaFunction.node.defaultChild as lambda.CfnFunction
    cfnLambda.cfnOptions.metadata = {
      "guard": {
        "SuppressedRules": [
          "LAMBDA_DLQ_CHECK",
          "LAMBDA_INSIDE_VPC",
          "LAMBDA_CONCURRENCY_CHECK"
        ]
      }
    }

    const executeLambdaManagedPolicy = new iam.ManagedPolicy(this, "ExecuteLambdaManagedPolicy", {
      description: `execute lambda ${props.lambdaName}`,
      statements: [
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: [lambdaFunction.functionArn]
        })]
    })

    // Outputs
    this.lambda = lambdaFunction
    this.executeLambdaManagedPolicy = executeLambdaManagedPolicy
  }
}
