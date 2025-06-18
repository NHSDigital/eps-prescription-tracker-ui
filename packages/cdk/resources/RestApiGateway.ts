import {RemovalPolicy} from "aws-cdk-lib"
import {
  CfnStage,
  CognitoUserPoolsAuthorizer,
  EndpointType,
  LogGroupLogDestination,
  MethodLoggingLevel,
  RestApi
} from "aws-cdk-lib/aws-apigateway"
import {
  IRole,
  Role,
  ServicePrincipal,
  PolicyDocument
} from "aws-cdk-lib/aws-iam"
import {IStream} from "aws-cdk-lib/aws-kinesis"
import {IKey} from "aws-cdk-lib/aws-kms"
import {CfnSubscriptionFilter, LogGroup} from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"
import {accessLogFormat} from "./RestApiGateway/accessLogFormat"
import {IUserPool} from "aws-cdk-lib/aws-cognito"

export interface RestApiGatewayProps {
  readonly serviceName: string
  readonly stackName: string
  readonly logRetentionInDays: number
  readonly logLevel: string
  readonly cloudwatchKmsKey: IKey
  readonly splunkDeliveryStream: IStream
  readonly splunkSubscriptionFilterRole: IRole
  readonly userPool?: IUserPool
  readonly resourcePolicy?: PolicyDocument
}

/**
 * Resources for a Rest API Gateway
 * Note - methods are not defined here
 * this just creates the api gateway and authorizer
 *
 * The gateway may have a userPool supplied, in which case it will create an
 * authorizer that gets exposed on the construct
 */

export class RestApiGateway extends Construct {
  public readonly apiGateway: RestApi
  public readonly apiGatewayRole: Role
  public readonly authorizer?: CognitoUserPoolsAuthorizer
  public readonly stageArn: string
  public readonly resourcePolicy: PolicyDocument
  oauth2ApiGateway: RestApi

  public constructor(scope: Construct, id: string, props: RestApiGatewayProps) {
    super(scope, id)

    // Resources
    const apiGatewayAccessLogGroup = new LogGroup(this, "ApiGatewayAccessLogGroup", {
      logGroupName: `/aws/apigateway/${props.serviceName}-apigw-${id}`,
      retention: props.logRetentionInDays,
      encryptionKey: props.cloudwatchKmsKey,
      removalPolicy: RemovalPolicy.DESTROY
    })

    new CfnSubscriptionFilter(this, "CoordinatorSplunkSubscriptionFilter", {
      destinationArn: props.splunkDeliveryStream.streamArn,
      filterPattern: "",
      logGroupName: apiGatewayAccessLogGroup.logGroupName,
      roleArn: props.splunkSubscriptionFilterRole.roleArn
    })

    const apiGateway = new RestApi(this, "ApiGateway", {
      restApiName: `${props.serviceName}-apigw-${id}`,
      endpointConfiguration: {
        types: [EndpointType.REGIONAL]
      },
      deploy: true,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(apiGatewayAccessLogGroup),
        accessLogFormat: accessLogFormat(),
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true
      },
      policy: props.resourcePolicy
    })

    // apiGateway.latestDeployment?.addLogicalId(Token.asAny(apiPolicy))

    const apiGatewayRole = new Role(this, "ApiGatewayRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
      managedPolicies: []
    })

    // An authorizer is only relevant for endpoints that need access control.
    // If the userPool is not passed, we know that these endpoints don't care about
    // access control, and can leave the authorizer undefined.
    let authorizer
    if (props.userPool) {
      authorizer = new CognitoUserPoolsAuthorizer(this, "Authorizer", {
        authorizerName: "cognitoAuth",
        cognitoUserPools: [props.userPool],
        identitySource: "method.request.header.authorization"
      })
    }

    const cfnStage = apiGateway.deploymentStage.node.defaultChild as CfnStage
    cfnStage.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "API_GW_CACHE_ENABLED_AND_ENCRYPTED"
        ]
      }
    }

    // Outputs
    this.apiGateway = apiGateway
    this.apiGatewayRole = apiGatewayRole
    this.authorizer = authorizer
    this.stageArn = apiGateway.deploymentStage.stageArn
  }
}
