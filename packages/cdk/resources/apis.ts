import * as apigateway from "aws-cdk-lib/aws-apigateway"

import {ApiResources} from "./apiResources"
import {Construct} from "constructs"
import {apiGwLogFormat, getLambdaInvokeURL} from "./helpers"
export interface ApisProps {
  /**
   * @default 'none'
   */
  readonly stackName: string;
  /**
   * @default 'none'
   */
  readonly statusFunctionName: string;
  /**
   * @default 'none'
   */
  readonly statusFunctionArn: string;
  /**
   * @default 30
   */
  readonly logRetentionInDays?: number;
  /**
   * @default 30
   */
  /**
   */
  readonly userPoolArn: string;
  readonly region: string;
  readonly executeStatusLambdaPolicyArn: string;
}

/**
 * PFP API's and related resources

 */
export class Apis extends Construct {
  public constructor(scope: Construct, id: string, props: ApisProps) {
    super(scope, id)

    // Applying default props
    props = {
      ...props,
      stackName: props.stackName,
      statusFunctionName: props.statusFunctionName,
      statusFunctionArn: props.statusFunctionArn,
      logRetentionInDays: props.logRetentionInDays ?? 30,
      region: props.region,
      executeStatusLambdaPolicyArn: props.executeStatusLambdaPolicyArn
    }

    // Resources
    const restApiGateway = new apigateway.CfnRestApi(this, "RestApiGateway", {
      name: `${props.stackName!}-apigw`,
      endpointConfiguration: {
        types: [
          "REGIONAL"
        ]
      }
    })

    const restApiGatewayResources = new ApiResources(this, "RestApiGatewayResources",
      {
        additionalPolicies: [
          props.executeStatusLambdaPolicyArn
        ],
        apiName: `${props.stackName!}-apigw`,
        logRetentionInDays: props.logRetentionInDays!
      }
    )

    const authorizer = new apigateway.CfnAuthorizer(this, "Authorizer", {
      name: "cognitoAuth",
      type: "COGNITO_USER_POOLS",
      identitySource: "method.request.header.authorization",
      providerArns: [
        props.userPoolArn!
      ],
      restApiId: restApiGateway.ref
    })

    const statusStatementResource = new apigateway.CfnResource(this, "StatusStatementResource", {
      restApiId: restApiGateway.ref,
      parentId: restApiGateway.attrRootResourceId,
      pathPart: "_status"
    })

    const statusMethod = new apigateway.CfnMethod(this, "StatusMethod", {
      restApiId: restApiGateway.ref,
      resourceId: statusStatementResource.ref,
      httpMethod: "GET",
      authorizationType: "COGNITO_USER_POOLS",
      authorizerId: authorizer.ref,
      integration: {
        type: "AWS_PROXY",
        credentials: restApiGatewayResources.apiGwRoleArn,
        integrationHttpMethod: "POST",
        uri: getLambdaInvokeURL(props.region, props.statusFunctionArn)
      }
    })

    const restApiGatewayDeploymentA = new apigateway.CfnDeployment(this, "RestApiGatewayDeploymentA", {
      restApiId: restApiGateway.ref
    })
    restApiGatewayDeploymentA.addDependency(statusMethod)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const restApiGatewayStage = new apigateway.CfnStage(this, "RestApiGatewayStage", {
      restApiId: restApiGateway.ref,
      stageName: "prod",
      deploymentId: restApiGatewayDeploymentA.ref,
      tracingEnabled: true,
      accessLogSetting: {
        destinationArn: restApiGatewayResources.apiGwAccessLogsArn,
        format: apiGwLogFormat
      }
    })
  }
}
