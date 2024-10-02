import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as iam from "aws-cdk-lib/aws-iam"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as lambda from "aws-cdk-lib/aws-lambda"

import {ApiGwConstruct} from "./apiGWConstruct"
import {Construct} from "constructs"
export interface ApisProps {
  readonly stackName: string;
  readonly statusLambda: lambda.Function;
  readonly logRetentionInDays?: number;
  readonly userPool: cognito.UserPool;
  readonly region: string;
  readonly executeStatusLambdaPolicy: iam.ManagedPolicy;
}

/**
 * PFP API's and related resources

 */
export class Apis extends Construct {
  public constructor(scope: Construct, id: string, props: ApisProps) {
    super(scope, id)

    // Resources
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "Authorizer", {
      authorizerName: "cognitoAuth",
      cognitoUserPools: [props.userPool],
      identitySource: "method.request.header.authorization"
    })

    const restApiGateway = new ApiGwConstruct(this, "RestApiGatewayResources",
      {
        additionalPolicies: [
          props.executeStatusLambdaPolicy
        ],
        apiName: `${props.stackName!}-apigw`,
        logRetentionInDays: props.logRetentionInDays!,
        stackName: props.stackName,
        apigwName: `${props.stackName!}-apigw`
      }
    )

    const statusResource = restApiGateway.apiGw.root.addResource("_status")
    statusResource.addMethod("GET", new apigateway.LambdaIntegration(props.statusLambda), {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: authorizer
    })
  }
}
