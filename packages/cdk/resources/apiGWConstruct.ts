
import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {CfnStage, EndpointType, RestApi} from "aws-cdk-lib/aws-apigateway"
import {IManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam"
import {Key} from "aws-cdk-lib/aws-kms"
import {CfnLogGroup, CfnSubscriptionFilter, LogGroup} from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface ApiGWConstructProps {
  readonly additionalPolicies?: Array<IManagedPolicy>;
  readonly apiName: string;
  readonly logRetentionInDays: number;
  readonly stackName: string;
  readonly apigwName: string;
}

export class ApiGwConstruct extends Construct {
  public readonly apiGwRole: Role
  public readonly apiGwAccessLogs: LogGroup
  public readonly apiGw: RestApi

  public constructor(scope: Construct, id: string, props: ApiGWConstructProps) {
    super(scope, id)

    // Resources
    const cloudWatchLogsKmsKey = Key.fromKeyArn(
      this,
      "cloudWatchLogsKmsKey",
      Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn")
    )
    const apiGwAccessLogs = new LogGroup(this, "ApiGwAccessLogs", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/apigateway/${props.apiName!}`,
      retention: props.logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })

    const cfnApiGwAccessLogs = apiGwAccessLogs.node.defaultChild as CfnLogGroup
    cfnApiGwAccessLogs.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    const apiGwRole = new Role(this, "ApiGwRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
      managedPolicies: props.additionalPolicies ?? []
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiGwAccessLogsSplunkSubscriptionFilter =
      new CfnSubscriptionFilter(this, "ApiGwAccessLogsSplunkSubscriptionFilter", {
        roleArn: Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"),
        logGroupName: apiGwAccessLogs.logGroupName,
        filterPattern: "",
        destinationArn: Fn.importValue("lambda-resources:SplunkDeliveryStream")
      })

    const restApiGateway = new RestApi(this, "RestApiGateway", {
      restApiName: props.apigwName,
      endpointConfiguration: {
        types: [
          EndpointType.REGIONAL
        ]
      },
      cloudWatchRole: false,
      deploy: true
    })

    const stage = restApiGateway.deploymentStage.node.defaultChild as CfnStage
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
    // Outputs
    this.apiGwRole = apiGwRole
    this.apiGwAccessLogs = apiGwAccessLogs
    this.apiGw = restApiGateway
  }
}
