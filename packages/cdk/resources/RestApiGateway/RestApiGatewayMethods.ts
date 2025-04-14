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
  readonly CIS2SignOutLambda: NodejsFunction
  readonly prescriptionListLambda: NodejsFunction
  readonly trackerUserInfoLambda: NodejsFunction
  readonly selectedRoleLambda: NodejsFunction
  readonly patientSearchLambda: NodejsFunction
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

    // cis2-signout endpoint
    const CIS2SignOutLambdaResource = props.restApiGateway.root.addResource("cis2-signout")
    CIS2SignOutLambdaResource.addMethod("GET", new LambdaIntegration(props.CIS2SignOutLambda, {
      credentialsRole: props.restAPiGatewayRole
    }), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: props.authorizer
    })

    // prescription-list endpoint
    const prescriptionListLambdaResource = props.restApiGateway.root.addResource("prescription-list")
    prescriptionListLambdaResource.addMethod("GET", new LambdaIntegration(props.prescriptionListLambda, {
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

    // patient-search endpoint
    const patientSearchLambdaResource = props.restApiGateway.root.addResource("patient-search")
    patientSearchLambdaResource.addMethod("GET", new LambdaIntegration(props.patientSearchLambda, {
      credentialsRole: props.restAPiGatewayRole
    }), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: props.authorizer
    })

    //Outputs
  }
}
