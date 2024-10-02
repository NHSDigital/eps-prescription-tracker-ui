import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as kms from "aws-cdk-lib/aws-kms"

import {Construct} from "constructs"
import {NagSuppressions} from "cdk-nag"

export interface ApiGWConstructProps {
  readonly additionalPolicies?: Array<iam.IManagedPolicy>;
  readonly apiName: string;
  readonly logRetentionInDays: number;
  readonly stackName: string;
  readonly apigwName: string;
}

export class ApiGwConstruct extends Construct {
  public readonly apiGwRole: iam.Role
  public readonly apiGwAccessLogs: logs.LogGroup
  public readonly apiGw: apigateway.RestApi

  public constructor(scope: Construct, id: string, props: ApiGWConstructProps) {
    super(scope, id)

    // Resources
    const cloudWatchLogsKmsKey = kms.Key.fromKeyArn(
      this,
      "cloudWatchLogsKmsKey",
      cdk.Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn")
    )
    const apiGwAccessLogs = new logs.LogGroup(this, "ApiGwAccessLogs", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/apigateway/${props.apiName!}`,
      retention: props.logRetentionInDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    const cfnApiGwAccessLogs = apiGwAccessLogs.node.defaultChild as logs.CfnLogGroup
    cfnApiGwAccessLogs.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    const apiGwRole = new iam.Role(this, "ApiGwRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      managedPolicies: props.additionalPolicies ?? []
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiGwAccessLogsSplunkSubscriptionFilter =
      new logs.CfnSubscriptionFilter(this, "ApiGwAccessLogsSplunkSubscriptionFilter", {
        roleArn: cdk.Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"),
        logGroupName: apiGwAccessLogs.logGroupName,
        filterPattern: "",
        destinationArn: cdk.Fn.importValue("lambda-resources:SplunkDeliveryStream")
      })

    const restApiGateway = new apigateway.RestApi(this, "RestApiGateway", {
      restApiName: props.apigwName,
      endpointConfiguration: {
        types: [
          apigateway.EndpointType.REGIONAL
        ]
      },
      cloudWatchRole: false,
      deploy: true
    })

    const stage = restApiGateway.deploymentStage.node.defaultChild as apigateway.CfnStage
    stage.accessLogSetting = {
      destinationArn: apiGwAccessLogs.logGroupArn,
      format: JSON.stringify({
        requestTime: "$context.requestTime",
        apiId: "$context.apiId",
        accountId: "$context.accountId",
        resourcePath: "$context.resourcePath",
        stage: "$context.stage",
        requestId: "$context.requestId",
        extendedRequestId: "$context.extendedRequestId",
        status: "$context.status",
        httpMethod: "$context.httpMethod",
        protocol: "$context.protocol",
        path: "$context.path",
        responseLatency: "$context.responseLatency",
        responseLength: "$context.responseLength",
        domainName: "$context.domainName",
        identity: {
          sourceIp: "$context.identity.sourceIp",
          userAgent: "$context.identity.userAgent",
          clientCert: {
            subjectDN: "$context.identity.clientCert.subjectDN",
            issuerDN: "$context.identity.clientCert.issuerDN",
            serialNumber: "$context.identity.clientCert.serialNumber",
            validityNotBefore: "$context.identity.clientCert.validity.notBefore",
            validityNotAfter: "$context.identity.clientCert.validity.notAfter"
          }},
        integration: {
          error: "$context.integration.error",
          integrationStatus: "$context.integration.integrationStatus",
          latency: "$context.integration.latency",
          requestId: "$context.integration.requestId",
          status: "$context.integration.status"
        }
      })
    }
    apiGwAccessLogs.grantWrite(new iam.ServicePrincipal("apigateway.amazonaws.com"))
    NagSuppressions.addResourceSuppressions(restApiGateway, [
      {
        id: "AwsSolutions-APIG2",
        reason: "Suppress error for not implementing validation"
      }
    ])
    NagSuppressions.addResourceSuppressions(stage, [
      {
        id: "AwsSolutions-APIG3",
        reason: "Suppress warning for not implementing WAF"
      },
      {
        id: "AwsSolutions-APIG6",
        reason: "Suppress error for not implementing cloudwatch logging as we do have it enabled"
      }
    ])

    // Outputs
    this.apiGwRole = apiGwRole
    this.apiGwAccessLogs = apiGwAccessLogs
    this.apiGw = restApiGateway
  }
}
