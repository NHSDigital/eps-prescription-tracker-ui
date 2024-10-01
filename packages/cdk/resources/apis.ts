import * as apigateway from "aws-cdk-lib/aws-apigateway"

import {ApiGwConstruct} from "./apiGWConstruct"
import {Construct} from "constructs"
import {apiGwLogFormat, getLambdaInvokeURL} from "./helpers"
import {NagSuppressions} from "cdk-nag"
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
    const restApiGateway = new ApiGwConstruct(this, "RestApiGatewayResources",
      {
        additionalPolicies: [
          props.executeStatusLambdaPolicyArn
        ],
        apiName: `${props.stackName!}-apigw`,
        logRetentionInDays: props.logRetentionInDays!,
        stackName: props.stackName,
        apigwName: `${props.stackName!}-apigw`
      }
    )

    const authorizer = new apigateway.CfnAuthorizer(this, "Authorizer", {
      name: "cognitoAuth",
      type: "COGNITO_USER_POOLS",
      identitySource: "method.request.header.authorization",
      providerArns: [
        props.userPoolArn!
      ],
      restApiId: restApiGateway.apiGwId
    })

    const statusStatementResource = new apigateway.CfnResource(this, "StatusStatementResource", {
      restApiId: restApiGateway.apiGwId,
      parentId: restApiGateway.attrRootResourceId,
      pathPart: "_status"
    })

    const statusMethod = new apigateway.CfnMethod(this, "StatusMethod", {
      restApiId: restApiGateway.apiGwId,
      resourceId: statusStatementResource.ref,
      httpMethod: "GET",
      authorizationType: "COGNITO_USER_POOLS",
      authorizerId: authorizer.ref,
      integration: {
        type: "AWS_PROXY",
        credentials: restApiGateway.apiGwRoleArn,
        integrationHttpMethod: "POST",
        uri: getLambdaInvokeURL(props.region, props.statusFunctionArn)
      }
    })

    const restApiGatewayDeploymentA = new apigateway.CfnDeployment(this, "RestApiGatewayDeploymentA", {
      restApiId: restApiGateway.apiGwId
    })
    restApiGatewayDeploymentA.addDependency(statusMethod)

    const restApiGatewayStage = new apigateway.CfnStage(this, "RestApiGatewayStage", {
      restApiId: restApiGateway.apiGwId,
      stageName: "prod",
      deploymentId: restApiGatewayDeploymentA.ref,
      tracingEnabled: true,
      accessLogSetting: {
        destinationArn: restApiGateway.apiGwAccessLogsArn,
        format: apiGwLogFormat
      }
    })

    NagSuppressions.addResourceSuppressions(restApiGatewayStage, [
      {
        id: "AwsSolutions-APIG3",
        reason: "Suppress warning for not implementing WAF"
      },
      {
        id: "AwsSolutions-APIG6",
        reason: "Suppress error for not implementing cloudwatch logging as we do have it enabled"
      }
    ])

  }
}
