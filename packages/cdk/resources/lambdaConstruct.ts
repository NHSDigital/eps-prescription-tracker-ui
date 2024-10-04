import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import * as kms from "aws-cdk-lib/aws-kms"
import * as lambda from "aws-cdk-lib/aws-lambda"
import {Construct} from "constructs"

import {getDefaultLambdaOptions} from "./helpers"

export interface LambdaConstructProps {
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
export class LambdaConstruct extends Construct {
  public readonly executeLambdaManagedPolicy: iam.ManagedPolicy
  public readonly lambda: nodeLambda.NodejsFunction

  public constructor(scope: Construct, id: string, props: LambdaConstructProps) {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lambdaSplunkSubscriptionFilter = new logs.CfnSubscriptionFilter(this, "LambdaSplunkSubscriptionFilter", {
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

    const lambda = new nodeLambda.NodejsFunction(this, props.lambdaName, {
      ...lambdaOptions,
      role: lambdaRole,
      environment: props.lambdaEnvironmentVariables,
      logGroup: lambdaLogGroup
    })

    const cfnLambda = lambda.node.defaultChild as lambda.CfnFunction
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
      statements: [
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: [lambda.functionArn]
        })]
    })

    // Outputs
    this.lambda = lambda
    this.executeLambdaManagedPolicy = executeLambdaManagedPolicy
  }
}
