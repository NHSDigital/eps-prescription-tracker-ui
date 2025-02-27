import {Construct} from "constructs"
import {LambdaFunction} from "../LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {SharedSecrets} from "../SharedSecrets"

export interface OAuth2FunctionsProps {
  readonly serviceName: string
  readonly stackName: string
  readonly fullCloudfrontDomain: string
  readonly userPoolClientId: string
  readonly primaryOidcAuthorizeEndpoint: string
  readonly primaryOidcClientId: string
  readonly useMockOidc: boolean
  readonly mockOidcAuthorizeEndpoint?: string
  readonly mockOidcClientId: string
  readonly stateMappingTable: ITableV2
  readonly stateMappingTableWritePolicy: IManagedPolicy
  readonly stateMappingTableReadPolicy: IManagedPolicy
  readonly useStateMappingKmsKeyPolicy: IManagedPolicy
  readonly logRetentionInDays: number
  readonly logLevel: string
  readonly sharedSecrets: SharedSecrets
  readonly jwtKid: string
}

/**
 * Functions and resources that are needed for OAuth2
 */
export class OAuth2Functions extends Construct {
  public readonly oAuth2Policies: Array<IManagedPolicy>
  public readonly authorizeLambda: NodejsFunction
  public readonly mockAuthorizeLambda: NodejsFunction
  public readonly idpResponseLambda: NodejsFunction
  public readonly mockIdpResponseLambda: NodejsFunction

  public constructor(scope: Construct, id: string, props: OAuth2FunctionsProps) {
    super(scope, id)

    // Create the login redirection `authorize` function
    const authorizeLambda = new LambdaFunction(this, "AuthorizeLambdaResources", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-authorize`,
      additionalPolicies: [
        props.stateMappingTableWritePolicy,
        props.stateMappingTableReadPolicy,
        props.useStateMappingKmsKeyPolicy,
        props.sharedSecrets.getRandomPasswordPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/proxyLoginLambda",
      entryPoint: "src/index.ts",
      lambdaEnvironmentVariables: {
        CIS2_IDP_AUTHORIZE_PATH: props.primaryOidcAuthorizeEndpoint,
        CIS2_OIDC_CLIENT_ID: props.primaryOidcClientId,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
        StateMappingTableName: props.stateMappingTable.tableName
      }
    })

    // This proxy handles the return journey from the IdP login initiated by the authorize lambda
    const idpResponseLambda = new LambdaFunction(this, "IDPResponseLambdaResources", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-idp-response`,
      additionalPolicies: [
        props.stateMappingTableWritePolicy,
        props.stateMappingTableReadPolicy,
        props.useStateMappingKmsKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/proxyIdpResponseLambda",
      entryPoint: "src/index.ts",
      lambdaEnvironmentVariables: {
        StateMappingTableName: props.stateMappingTable.tableName,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain
      }
    })

    // Initialize policies
    const oauth2Policies: Array<IManagedPolicy> = [
      authorizeLambda.executeLambdaManagedPolicy,
      idpResponseLambda.executeLambdaManagedPolicy
    ]

    // If mock OIDC is enabled, configure mock token Lambda
    let mockAuthorizeLambda: LambdaFunction | undefined
    let mockIdpResponseLambda: LambdaFunction | undefined
    if (props.useMockOidc) {
      if (
        !props.mockOidcAuthorizeEndpoint
      ) {
        throw new Error("Missing mock OIDC configuration.")
      }

      // Create the mock login redirection `authorize` function
      mockAuthorizeLambda = new LambdaFunction(this, "MockAuthorizeLambdaResources", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mock-authorize`,
        additionalPolicies: [
          props.stateMappingTableWritePolicy,
          props.stateMappingTableReadPolicy,
          props.useStateMappingKmsKeyPolicy,
          props.sharedSecrets.getRandomPasswordPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/proxyLoginLambda",
        entryPoint: "src/index.ts",
        lambdaEnvironmentVariables: {
          CIS2_IDP_AUTHORIZE_PATH: props.mockOidcAuthorizeEndpoint,
          CIS2_OIDC_CLIENT_ID: props.mockOidcClientId,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
          StateMappingTableName: props.stateMappingTable.tableName
        }
      })

      // Create the mock login return lambda function
      mockIdpResponseLambda = new LambdaFunction(this, "MockIDPResponseLambdaResources", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mock-idp-resp`,
        additionalPolicies: [
          props.stateMappingTableWritePolicy,
          props.stateMappingTableReadPolicy,
          props.useStateMappingKmsKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/proxyIdpResponseLambda",
        entryPoint: "src/index.ts",
        lambdaEnvironmentVariables: {
          StateMappingTableName: props.stateMappingTable.tableName,
          COGNITO_CLIENT_ID: props.userPoolClientId,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain
        }
      })

      oauth2Policies.push(mockAuthorizeLambda.executeLambdaManagedPolicy)
      oauth2Policies.push(mockIdpResponseLambda.executeLambdaManagedPolicy)
      this.mockAuthorizeLambda = mockAuthorizeLambda.lambda
      this.mockIdpResponseLambda = mockIdpResponseLambda.lambda
    }

    // Outputs
    this.oAuth2Policies = oauth2Policies
    this.authorizeLambda = authorizeLambda.lambda
    this.idpResponseLambda = idpResponseLambda.lambda
  }
}
