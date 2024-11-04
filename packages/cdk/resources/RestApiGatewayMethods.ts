import {IManagedPolicy, IRole} from "aws-cdk-lib/aws-iam"
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  MockIntegration,
  PassthroughBehavior,
  RestApi
} from "aws-cdk-lib/aws-apigateway"
import {Construct} from "constructs"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"

export interface RestApiGatewayMethodsProps {
  readonly extraPolices: Array<IManagedPolicy>
  readonly restAPiGatewayRole: IRole
  readonly restApiGateway: RestApi
  readonly tokenLambda: NodejsFunction
  readonly mockTokenLambda: NodejsFunction
  readonly useMockOidc: boolean
  readonly authorizer: CognitoUserPoolsAuthorizer

}

/**
 * Resources for a static content S3 bucket

 */

export class RestApiGatewayMethods extends Construct{

  public constructor(scope: Construct, id: string, props: RestApiGatewayMethodsProps){
    super(scope, id)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/

    // Imports

    // Resources
    for (var policy of props.extraPolices) {
      props.restAPiGatewayRole.addManagedPolicy(policy)
    }
    const tokenResource = props.restApiGateway.root.addResource("token")
    tokenResource.addMethod("POST", new LambdaIntegration(props.tokenLambda, {
      credentialsRole: props.restAPiGatewayRole
    }))

    // mocktoken endpoint
    if (props.useMockOidc) {
      const mockTokenResource = props.restApiGateway.root.addResource("mocktoken")
      mockTokenResource.addMethod("POST", new LambdaIntegration(props.mockTokenLambda, {
        credentialsRole: props.restAPiGatewayRole
      }))
    }

    /* Dummy Method/Resource to test cognito auth */

    const mockNoAuth = new MockIntegration({
      passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
      requestTemplates: {
        "application/json": JSON.stringify({
          statusCode: 200
        })
      },
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: {
            "application/json": JSON.stringify({
              message: "This does not require auth"
            })
          }
        }
      ]
    })
    const mockTeapotResource = props.restApiGateway.root.addResource("mocknoauth")
    mockTeapotResource.addMethod("GET", mockNoAuth, {
      methodResponses: [
        {statusCode: "200"}
      ]
    })

    const mockWithAuth = new MockIntegration({
      passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
      requestTemplates: {
        "application/json": JSON.stringify({
          statusCode: 200
        })
      },
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: {
            "application/json": JSON.stringify({
              message: "This does require auth"
            })
          }
        }
      ]
    })
    const mockAuthResource = props.restApiGateway.root.addResource("mockwithauth")
    mockAuthResource.addMethod("GET", mockWithAuth, {
      methodResponses: [
        {statusCode: "200"}
      ],
      authorizationType: AuthorizationType.COGNITO,
      authorizer: props.authorizer
    })

    //Outputs
  }
}