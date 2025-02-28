import {IManagedPolicy, IRole} from "aws-cdk-lib/aws-iam"
import {LambdaIntegration, RestApi} from "aws-cdk-lib/aws-apigateway"
import {Construct} from "constructs"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"

export interface OAuth2ApiGatewayMethodsProps {
  readonly executePolices: Array<IManagedPolicy>
  readonly oauth2APiGatewayRole: IRole
  readonly oauth2ApiGateway: RestApi
  readonly authorizeLambda: NodejsFunction
  readonly mockAuthorizeLambda: NodejsFunction
  readonly idpResponseLambda: NodejsFunction
  readonly mockIdpResponseLambda: NodejsFunction
  readonly pingResponseLambda: NodejsFunction
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

    // Authorize redirection endpoint
    const authorizeResource = props.oauth2ApiGateway.root.addResource("authorize")
    authorizeResource.addMethod("GET", new LambdaIntegration(props.authorizeLambda, {
      credentialsRole: props.oauth2APiGatewayRole
    }))

    // Return journey login callback.
    const idpResponseResource = props.oauth2ApiGateway.root.addResource("callback")
    idpResponseResource.addMethod("GET", new LambdaIntegration(props.idpResponseLambda, {
      credentialsRole: props.oauth2APiGatewayRole
    }))

    // Ping endpoint
    const pingResponseResource = props.oauth2ApiGateway.root.addResource("ping")
    pingResponseResource.addMethod("GET", new LambdaIntegration(props.pingResponseLambda, {
      credentialsRole: props.oauth2APiGatewayRole
    }))

    //Outputs
  }
}
