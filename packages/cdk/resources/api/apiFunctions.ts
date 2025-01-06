import {Construct} from "constructs"
import {LambdaFunction} from "../LambdaFunction"
import {SharedSecrets} from "../SharedSecrets"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {NagSuppressions} from "cdk-nag"

// Interface for properties needed to create API functions
export interface ApiFunctionsProps {
  readonly serviceName: string
  readonly stackName: string
  readonly primaryOidcTokenEndpoint: string
  readonly primaryOidcUserInfoEndpoint: string
  readonly primaryOidcjwksEndpoint: string
  readonly primaryOidcClientId: string
  readonly primaryOidcIssuer: string
  readonly useMockOidc: boolean
  readonly mockOidcTokenEndpoint?: string
  readonly mockOidcUserInfoEndpoint?: string
  readonly mockOidcjwksEndpoint?: string
  readonly mockOidcClientId?: string
  readonly mockOidcIssuer?: string
  readonly tokenMappingTable: ITableV2
  readonly tokenMappingTableWritePolicy: IManagedPolicy
  readonly tokenMappingTableReadPolicy: IManagedPolicy
  readonly useTokensMappingKmsKeyPolicy: IManagedPolicy
  readonly primaryPoolIdentityProviderName: string
  readonly mockPoolIdentityProviderName: string
  readonly logRetentionInDays: number
  readonly sharedSecrets: SharedSecrets
  readonly apigeeCIS2TokenEndpoint: string
  readonly apigeeMockTokenEndpoint: string
  readonly apigeePrescriptionsEndpoint: string
  readonly apigeeApiKey: string
  readonly jwtKid: string
  readonly logLevel: string
  readonly roleId: string
}

/**
 * Class for creating functions and resources needed for API operations
 */
export class ApiFunctions extends Construct {
  public readonly apiFunctionsPolicies: Array<IManagedPolicy>
  public readonly prescriptionSearchLambda: NodejsFunction
  public readonly trackerUserInfoLambda: NodejsFunction
  public readonly primaryJwtPrivateKey: Secret

  public constructor(scope: Construct, id: string, props: ApiFunctionsProps) {
    super(scope, id)

    // Permissions for API Gateway to execute lambdas
    const apiFunctionsPolicies: Array<IManagedPolicy> = []

    // Combine policies
    const additionalPolicies = [
      props.tokenMappingTableWritePolicy,
      props.tokenMappingTableReadPolicy,
      props.useTokensMappingKmsKeyPolicy,
      props.sharedSecrets.useJwtKmsKeyPolicy,
      props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy
    ]

    if (props.useMockOidc && props.sharedSecrets.getMockJwtPrivateKeyPolicy) {
      additionalPolicies.push(props.sharedSecrets.getMockJwtPrivateKeyPolicy)
    }

    // Environment variables
    // We pass in both sets of endpoints and keys. The Lambda code determines at runtime which to use.
    const lambdaEnv: {[key: string]: string} = {
      TokenMappingTableName: props.tokenMappingTable.tableName,

      // Real endpoints/credentials
      REAL_IDP_TOKEN_PATH: props.primaryOidcTokenEndpoint,
      REAL_USER_INFO_ENDPOINT: props.primaryOidcUserInfoEndpoint,
      REAL_OIDCJWKS_ENDPOINT: props.primaryOidcjwksEndpoint,
      REAL_JWT_PRIVATE_KEY_ARN: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
      REAL_USER_POOL_IDP: props.primaryPoolIdentityProviderName,
      REAL_USE_SIGNED_JWT: "true",
      REAL_OIDC_CLIENT_ID: props.primaryOidcClientId,
      REAL_OIDC_ISSUER: props.primaryOidcIssuer,

      // Indicate if mock mode is available
      MOCK_MODE_ENABLED: props.useMockOidc ? "true" : "false"
    }

    // If mock OIDC is enabled, add mock environment variables
    if (props.useMockOidc && props.sharedSecrets.mockJwtPrivateKey.secretArn) {
      lambdaEnv["MOCK_IDP_TOKEN_PATH"] = props.mockOidcTokenEndpoint!
      lambdaEnv["MOCK_USER_INFO_ENDPOINT"] = props.mockOidcUserInfoEndpoint!
      lambdaEnv["MOCK_OIDCJWKS_ENDPOINT"] = props.mockOidcjwksEndpoint!
      lambdaEnv["MOCK_JWT_PRIVATE_KEY_ARN"] = props.sharedSecrets.mockJwtPrivateKey.secretArn
      lambdaEnv["MOCK_USER_POOL_IDP"] = props.mockPoolIdentityProviderName
      lambdaEnv["MOCK_USE_SIGNED_JWT"] = "false"
      lambdaEnv["MOCK_OIDC_CLIENT_ID"] = props.mockOidcClientId!
      lambdaEnv["MOCK_OIDC_ISSUER"] = props.mockOidcIssuer!
    }

    // Single Lambda for both real and mock scenarios
    const trackerUserInfoLambda = new LambdaFunction(this, "TrackerUserInfo", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-TrkUsrNfoUnified`,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/trackerUserInfoLambda",
      entryPoint: "src/handler.ts",
      lambdaEnvironmentVariables: lambdaEnv
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(trackerUserInfoLambda.executeLambdaManagedPolicy)

    // Prescription Search Lambda Function
    const prescriptionSearchLambda = new LambdaFunction(this, "PrescriptionSearch", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-prescSearch`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKmsKeyPolicy,
        props.sharedSecrets.useJwtKmsKeyPolicy,
        props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/prescriptionSearchLambda",
      entryPoint: "src/handler.ts",
      lambdaEnvironmentVariables: {
        idpTokenPath: props.primaryOidcTokenEndpoint,
        TokenMappingTableName: props.tokenMappingTable.tableName,
        UserPoolIdentityProvider: props.primaryPoolIdentityProviderName,
        oidcjwksEndpoint: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        userInfoEndpoint: props.primaryOidcUserInfoEndpoint,
        useSignedJWT: "true",
        oidcClientId: props.primaryOidcClientId,
        oidcIssuer: props.primaryOidcIssuer,
        apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
        apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint,
        apigeePrescriptionsEndpoint: props.apigeePrescriptionsEndpoint,
        apigeeApiKey: props.apigeeApiKey,
        jwtKid: props.jwtKid,
        roleId: props.roleId,
        MOCK_MODE_ENABLED: props.useMockOidc ? "true" : "false"
      }
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(prescriptionSearchLambda.executeLambdaManagedPolicy)

    // const apiFunctionsPolicies: Array<IManagedPolicy> = [
    //   trackerUserInfoLambda.executeLambdaManagedPolicy,
    //   prescriptionSearchLambda.executeLambdaManagedPolicy
    // ]

    // Suppress the AwsSolutions-L1 rule for the prescription search Lambda function
    NagSuppressions.addResourceSuppressions(prescriptionSearchLambda.lambda, [
      {
        id: "AwsSolutions-L1",
        reason: "The Lambda function uses the latest runtime version supported at the time of implementation."
      }
    ])

    // Outputs
    this.apiFunctionsPolicies = apiFunctionsPolicies
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey

    this.prescriptionSearchLambda = prescriptionSearchLambda.lambda
    this.trackerUserInfoLambda = trackerUserInfoLambda.lambda
  }
}
