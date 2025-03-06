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
  readonly executePolices: Array<IManagedPolicy>
  readonly restAPiGatewayRole: IRole
  readonly restApiGateway: RestApi
  readonly tokenLambda: NodejsFunction
  readonly mockTokenLambda: NodejsFunction
  readonly prescriptionSearchLambda: NodejsFunction
  readonly trackerUserInfoLambda: NodejsFunction
  readonly selectedRoleLambda: NodejsFunction
  readonly useMockOidc: boolean
  readonly authorizer?: CognitoUserPoolsAuthorizer
}

/**
 * Resources for a api gateway methods
 * executePolicies should be policies that are needed to execute lambdas

 */

export class RestApiGatewayMethods extends Construct {

  public constructor(scope: Construct, id: string, props: RestApiGatewayMethodsProps) {
    super(scope, id)

    if (!props.authorizer) {
      throw new Error("Missing authorizer prop")
    }

    // Resources
    for (const policy of props.executePolices) {
      props.restAPiGatewayRole.addManagedPolicy(policy)
    }

    const tokenResource = props.restApiGateway.root.addResource("token")
    tokenResource.addMethod("POST", new LambdaIntegration(props.tokenLambda, {
      credentialsRole: props.restAPiGatewayRole
    }))

    // mock token endpoint
    if (props.useMockOidc) {
      const mockTokenResource = props.restApiGateway.root.addResource("mocktoken")
      mockTokenResource.addMethod("POST", new LambdaIntegration(props.mockTokenLambda, {
        credentialsRole: props.restAPiGatewayRole
      }))
    }

    // prescription-search endpoint
    const prescriptionSearchLambdaResource = props.restApiGateway.root.addResource("prescription-search")
    prescriptionSearchLambdaResource.addMethod("GET", new LambdaIntegration(props.prescriptionSearchLambda, {
      credentialsRole: props.restAPiGatewayRole
    }), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: props.authorizer
    })

    // tracker-user-info endpoint
    const trackerUserInfoLambdaResource = props.restApiGateway.root.addResource("tracker-user-info")
    trackerUserInfoLambdaResource.addMethod("GET", new LambdaIntegration(props.trackerUserInfoLambda, {
      credentialsRole: props.restAPiGatewayRole
    }), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: props.authorizer
    })

    // selected-role endpoint
    const selectedRoleLambdaResource = props.restApiGateway.root.addResource("selected-role")
    selectedRoleLambdaResource.addMethod("PUT", new LambdaIntegration(props.selectedRoleLambda, {
      credentialsRole: props.restAPiGatewayRole
    }), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: props.authorizer
    })

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
