import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {
  CfnStage,
  EndpointType,
  LogGroupLogDestination,
  MethodLoggingLevel,
  MockIntegration,
  RestApi
} from "aws-cdk-lib/aws-apigateway"
import {Role, ServicePrincipal} from "aws-cdk-lib/aws-iam"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {Key} from "aws-cdk-lib/aws-kms"
import {FilterPattern, LogGroup, SubscriptionFilter} from "aws-cdk-lib/aws-logs"
import {KinesisDestination} from "aws-cdk-lib/aws-logs-destinations"
import {Construct} from "constructs"
import {accessLogFormat} from "./RestApiGateway/accessLogFormat"

export interface RestApiGatewayProps {
  serviceName: string
  stackName: string
}

/**
 * Resources for a Rest API Gateway

 */

export class RestApiGateway extends Construct {
  public readonly restApiGateway: RestApi
  public readonly restAPiGatewayRole: Role

  public constructor(scope: Construct, id: string, props: RestApiGatewayProps){
    super(scope, id)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const logRetentionInDays: number = Number(this.node.tryGetContext("logRetentionInDays"))

    // Imports
    const cloudwatchKmsKey = Key.fromKeyArn(
      this, "cloudwatchKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))

    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    // Resources
    const apiGatewayAccessLogGroup = new LogGroup(this, "ApiGatewayAccessLogGroup", {
      logGroupName: `/aws/apigateway/${props.stackName}-apigw`,
      retention: logRetentionInDays,
      encryptionKey: cloudwatchKmsKey,
      removalPolicy: RemovalPolicy.DESTROY
    })

    new SubscriptionFilter(this, "ApiGatewayAccessLogsSplunkSubscriptionFilter", {
      logGroup: apiGatewayAccessLogGroup,
      filterPattern: FilterPattern.allTerms(),
      destination: new KinesisDestination(splunkDeliveryStream, {
        role: splunkSubscriptionFilterRole
      })
    })

    const apiGateway = new RestApi(this, "ApiGateway", {
      restApiName: `${props.serviceName}-${props.stackName}-apigw`,
      endpointConfiguration: {
        types: [EndpointType.REGIONAL]
      },
      deploy: true,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(apiGatewayAccessLogGroup),
        accessLogFormat: accessLogFormat(),
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true
      }
    })

    const apiGatewayRole = new Role(this, "ApiGatewayRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
      managedPolicies: []
    })

    /* Dummy Method/Resource to allow a gateway to be deployed "empty" */
    apiGateway.root.addMethod("ANY", new MockIntegration({
      integrationResponses: [
        {statusCode: "418"}
      ]
    }))

    const cfnStage = apiGateway.deploymentStage.node.defaultChild as CfnStage
    cfnStage.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "API_GW_CACHE_ENABLED_AND_ENCRYPTED"
        ]
      }
    }

    // Outputs
    this.restApiGateway = apiGateway
    this.restAPiGatewayRole = apiGatewayRole
  }
}
