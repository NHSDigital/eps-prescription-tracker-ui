import {RemovalPolicy} from "aws-cdk-lib"
import {
  CfnStage,
  CognitoUserPoolsAuthorizer,
  EndpointType,
  LogGroupLogDestination,
  MethodLoggingLevel,
  RestApi
} from "aws-cdk-lib/aws-apigateway"
import {IRole, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam"
import {IStream} from "aws-cdk-lib/aws-kinesis"
import {IKey} from "aws-cdk-lib/aws-kms"
import {FilterPattern, LogGroup, SubscriptionFilter} from "aws-cdk-lib/aws-logs"
import {KinesisDestination} from "aws-cdk-lib/aws-logs-destinations"
import {Construct} from "constructs"
import {accessLogFormat} from "./RestApiGateway/accessLogFormat"
import {IUserPool} from "aws-cdk-lib/aws-cognito"

export interface RestApiGatewayProps {
  readonly serviceName: string
  readonly stackName: string
  readonly logRetentionInDays: number
  readonly cloudwatchKmsKey: IKey
  readonly splunkDeliveryStream: IStream
  readonly splunkSubscriptionFilterRole: IRole
  readonly userPool: IUserPool
}

/**
 * Resources for a Rest API Gateway
 * Note - methods are not defined here
 * this just creates the api gateway and authorizer

 */

export class RestApiGateway extends Construct {
  public readonly restApiGateway: RestApi
  public readonly restAPiGatewayRole: Role
  public readonly authorizer: CognitoUserPoolsAuthorizer

  public constructor(scope: Construct, id: string, props: RestApiGatewayProps){
    super(scope, id)

    // Resources
    const apiGatewayAccessLogGroup = new LogGroup(this, "ApiGatewayAccessLogGroup", {
      logGroupName: `/aws/apigateway/${props.serviceName}-apigw`,
      retention: props.logRetentionInDays,
      encryptionKey: props.cloudwatchKmsKey,
      removalPolicy: RemovalPolicy.DESTROY
    })

    new SubscriptionFilter(this, "ApiGatewayAccessLogsSplunkSubscriptionFilter", {
      logGroup: apiGatewayAccessLogGroup,
      filterPattern: FilterPattern.allTerms(),
      destination: new KinesisDestination(props.splunkDeliveryStream, {
        role: props.splunkSubscriptionFilterRole
      })
    })

    const apiGateway = new RestApi(this, "ApiGateway", {
      restApiName: `${props.serviceName}-apigw`,
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

    const authorizer = new CognitoUserPoolsAuthorizer(this, "Authorizer", {
      authorizerName: "cognitoAuth",
      cognitoUserPools: [props.userPool],
      identitySource: "method.request.header.authorization"
    })

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
    this.authorizer = authorizer
  }
}
