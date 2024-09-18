import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface LambdaResourcesProps {
  /**
   */
  readonly stackName: string;
  /**
   * @default 'none'
   */
  readonly lambdaName?: string;
  /**
   * @default 'none'
   */
  readonly lambdaArn?: string;
  /**
   * @default 'false'
   */
  readonly includeAdditionalPolicies?: boolean;
  /**
   * A list of additional policies to attach the lambdas role (comma delimited).
   * @default 'none'
   */
  readonly additionalPolicies?: Array<string>;
  /**
   */
  readonly logRetentionInDays: number;
  /**
   * @default 30
   */
}

/**
 * Resources for a lambda

 */
export class LambdaResources extends Construct {
  /**
   * LambdaRole ARN
   */
  public readonly lambdaRoleArn
  /**
   * Lambda execution policy arn
   */
  public readonly executeLambdaPolicyArn

  public constructor(scope: Construct, id: string, props: LambdaResourcesProps) {
    super(scope, id)

    // Applying default props
    props = {
      ...props,
      lambdaName: props.lambdaName ?? "none",
      lambdaArn: props.lambdaArn ?? "none",
      includeAdditionalPolicies: props.includeAdditionalPolicies ?? false,
      additionalPolicies: props.additionalPolicies ?? []
    }

    // Conditions
    const shouldIncludeAdditionalPolicies = true === props.includeAdditionalPolicies!

    // Resources
    const executeLambdaManagedPolicy = new iam.CfnManagedPolicy(this, "ExecuteLambdaManagedPolicy", {
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "lambda:InvokeFunction"
            ],
            Resource: [
              `${props.lambdaArn!}*`
            ]
          }
        ]
      }
    })

    const lambdaLogGroup = new logs.CfnLogGroup(this, "LambdaLogGroup", {
      logGroupName: `/aws/lambda/${props.lambdaName!}`,
      retentionInDays: props.logRetentionInDays!,
      kmsKeyId: cdk.Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn")
    })
    lambdaLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    const lambdaManagedPolicy = new iam.CfnManagedPolicy(this, "LambdaManagedPolicy", {
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "logs:CreateLogStream",
              "logs:PutLogEvents"
            ],
            Resource: [
              lambdaLogGroup.attrArn,
              `${lambdaLogGroup.attrArn}:log-stream:*`
            ]
          }
        ]
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lambdaSplunkSubscriptionFilter = new logs.CfnSubscriptionFilter(this, "LambdaSplunkSubscriptionFilter", {
      roleArn: cdk.Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"),
      logGroupName: lambdaLogGroup.ref,
      filterPattern: "",
      destinationArn: cdk.Fn.importValue("lambda-resources:SplunkDeliveryStream")
    })

    const managedPolicyArns: Array<string> = [
      lambdaManagedPolicy.ref,
      cdk.Fn.importValue("lambda-resources:LambdaInsightsLogGroupPolicy"),
      cdk.Fn.importValue("account-resources:CloudwatchEncryptionKMSPolicyArn"),
      cdk.Fn.importValue("account-resources:LambdaDecryptSecretsKMSPolicy")
    ]

    // eslint-disable-next-line max-len
    if (shouldIncludeAdditionalPolicies && typeof props.additionalPolicies !== "undefined" && props.additionalPolicies?.length > 0 ) {
      managedPolicyArns.concat(props.additionalPolicies)
    }
    const lambdaRole = new iam.CfnRole(this, "LambdaRole", {
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com"
            },
            Action: [
              "sts:AssumeRole"
            ]
          }
        ]
      },
      managedPolicyArns: managedPolicyArns
    })

    // Outputs
    this.lambdaRoleArn = lambdaRole.attrArn
    this.executeLambdaPolicyArn = executeLambdaManagedPolicy.attrPolicyArn
  }
}
