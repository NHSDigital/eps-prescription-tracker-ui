import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"

import {Construct} from "constructs"
import {NagSuppressions} from "cdk-nag"

export interface ApiGWConstructProps {
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
  readonly stackName: string;
  readonly apigwName: string;
}

/**
 * Resources for an API

 */
export class ApiGwConstruct extends Construct {
  /**
   * The API GW role ARN
   */
  public readonly apiGwRoleArn
  /**
   * The API GW access logs ARN
   */
  public readonly apiGwAccessLogsArn
  public readonly apiGwId
  public readonly attrRootResourceId

  public constructor(scope: Construct, id: string, props: ApiGWConstructProps) {
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

    const restApiGateway = new apigateway.CfnRestApi(this, "RestApiGateway", {
      name: props.apigwName,
      endpointConfiguration: {
        types: [
          "REGIONAL"
        ]
      }
    })

    NagSuppressions.addResourceSuppressions(restApiGateway, [
      {
        id: "AwsSolutions-APIG2",
        reason: "Suppress error for not implementing validation"
      }
    ])

    // Outputs
    this.apiGwRoleArn = apiGwRole.attrArn
    this.apiGwAccessLogsArn = apiGwAccessLogs.attrArn
    this.apiGwId = restApiGateway.ref
    this.attrRootResourceId = restApiGateway.attrRootResourceId
  }
}
