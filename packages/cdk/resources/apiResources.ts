import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface ApiResourcesProps {
  /**
   * A list of additional policies to attach to the API gateway role
   * @default 'none'
   */
  readonly additionalPolicies?: Array<string>;
  /**
   * @default 'none'
   */
  readonly apiName?: string;
  /**
   * @default 30
   */
  readonly logRetentionInDays?: number;
}

/**
 * Resources for an API

 */
export class ApiResources extends Construct {
  /**
   * The API GW role ARN
   */
  public readonly apiGwRoleArn
  /**
   * The API GW access logs ARN
   */
  public readonly apiGwAccessLogsArn

  public constructor(scope: Construct, id: string, props: ApiResourcesProps = {}) {
    super(scope, id)

    // Applying default props
    props = {
      ...props,
      additionalPolicies: props.additionalPolicies ?? [],
      apiName: props.apiName ?? "none",
      logRetentionInDays: props.logRetentionInDays ?? 30
    }

    // Resources
    const apiGwAccessLogs = new logs.CfnLogGroup(this, "ApiGwAccessLogs", {
      logGroupName: `/aws/apigateway/${props.apiName!}`,
      retentionInDays: props.logRetentionInDays!,
      kmsKeyId: cdk.Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn")
    })
    apiGwAccessLogs.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    const apiGwRole = new iam.CfnRole(this, "ApiGwRole", {
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: [
                "apigateway.amazonaws.com"
              ]
            },
            Action: [
              "sts:AssumeRole"
            ]
          }
        ]
      },
      managedPolicyArns: [ ...(props.additionalPolicies ?? [])]
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiGwAccessLogsSplunkSubscriptionFilter =
      new logs.CfnSubscriptionFilter(this, "ApiGwAccessLogsSplunkSubscriptionFilter", {
        roleArn: cdk.Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"),
        logGroupName: apiGwAccessLogs.ref,
        filterPattern: "",
        destinationArn: cdk.Fn.importValue("lambda-resources:SplunkDeliveryStream")
      })

    // Outputs
    this.apiGwRoleArn = apiGwRole.attrArn
    this.apiGwAccessLogsArn = apiGwAccessLogs.attrArn
  }
}
