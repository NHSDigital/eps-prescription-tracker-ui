import {IManagedPolicy, IRole} from "aws-cdk-lib/aws-iam"
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi
} from "aws-cdk-lib/aws-apigateway"
import {Construct} from "constructs"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"

export interface RestApiGatewayMethodsProps {
  readonly executePolices: Array<IManagedPolicy>
  readonly restAPiGatewayRole: IRole
  readonly restApiGateway: RestApi
  readonly prescriptionSearchLambda: NodejsFunction
  readonly prescriptionDetailsLambda: NodejsFunction
  readonly trackerUserInfoLambda: NodejsFunction
  readonly selectedRoleLambda: NodejsFunction
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

    // prescription-search endpoint
    const prescriptionSearchLambdaResource = props.restApiGateway.root.addResource("prescription-search")
    prescriptionSearchLambdaResource.addMethod("GET", new LambdaIntegration(props.prescriptionSearchLambda, {
      credentialsRole: props.restAPiGatewayRole
    }), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: props.authorizer
    })

    // prescription-details endpoint
    const prescriptionDetailsLambdaResource = props.restApiGateway.root
      .addResource("prescription-details")
      .addResource("{prescriptionId}") // Accepts prescriptionId as a path parameter
    prescriptionDetailsLambdaResource.addMethod("GET", new LambdaIntegration(props.prescriptionDetailsLambda, {
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

    //Outputs
  }
}
