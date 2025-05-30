import {IManagedPolicy, IRole} from "aws-cdk-lib/aws-iam"
import {LambdaIntegration, RestApi} from "aws-cdk-lib/aws-apigateway"
import {Construct} from "constructs"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"

export interface OAuth2ApiGatewayMethodsProps {
  readonly executePolices: Array<IManagedPolicy>
  readonly oauth2APiGatewayRole: IRole
  readonly oauth2ApiGateway: RestApi
  readonly tokenLambda: NodejsFunction
  readonly mockTokenLambda: NodejsFunction
  readonly authorizeLambda: NodejsFunction
  readonly mockAuthorizeLambda: NodejsFunction
  readonly callbackLambda: NodejsFunction
  readonly mockCallbackLambda: NodejsFunction
  readonly useMockOidc: boolean
}

/**
 * Resources for a api gateway methods
 * executePolicies should be policies that are needed to execute lambdas
 */

export class OAuth2ApiGatewayMethods extends Construct {

  public constructor(scope: Construct, id: string, props: OAuth2ApiGatewayMethodsProps) {
    super(scope, id)

    // Resources
    for (const policy of props.executePolices) {
      props.oauth2APiGatewayRole.addManagedPolicy(policy)
    }

    const tokenResource = props.oauth2ApiGateway.root.addResource("token")
    tokenResource.addMethod("POST", new LambdaIntegration(props.tokenLambda, {
      credentialsRole: props.oauth2APiGatewayRole
    }))

    // mock token endpoint
    if (props.useMockOidc) {
      const mockTokenResource = props.oauth2ApiGateway.root.addResource("mock-token")
      mockTokenResource.addMethod("POST", new LambdaIntegration(props.mockTokenLambda, {
        credentialsRole: props.oauth2APiGatewayRole
      }))
    }

    // Authorize redirection endpoint
    const authorizeResource = props.oauth2ApiGateway.root.addResource("authorize")
    authorizeResource.addMethod("GET", new LambdaIntegration(props.authorizeLambda, {
      credentialsRole: props.oauth2APiGatewayRole
    }))

    // MOCK Authorize redirection endpoint
    if (props.useMockOidc) {
      const mockAuthorizeResource = props.oauth2ApiGateway.root.addResource("mock-authorize")
      mockAuthorizeResource.addMethod("GET", new LambdaIntegration(props.mockAuthorizeLambda, {
        credentialsRole: props.oauth2APiGatewayRole
      }))
    }

    // Return journey login callback.
    const callbackResource = props.oauth2ApiGateway.root.addResource("callback")
    callbackResource.addMethod("GET", new LambdaIntegration(props.callbackLambda, {
      credentialsRole: props.oauth2APiGatewayRole
    }))

    // Return journey login callback.
    if (props.useMockOidc) {
      const mockCallbackResource = props.oauth2ApiGateway.root.addResource("mock-callback")
      mockCallbackResource.addMethod("GET", new LambdaIntegration(props.mockCallbackLambda, {
        credentialsRole: props.oauth2APiGatewayRole
      }))
    }
    //Outputs
  }
}
