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
  public readonly prescriptionDetailsLambda: NodejsFunction
  public readonly trackerUserInfoLambda: NodejsFunction
  public readonly selectedRoleLambda: NodejsFunction
  public readonly primaryJwtPrivateKey: Secret
  public readonly doHSApiKeySecret: Secret

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
    const commonLambdaEnv: {[key: string]: string} = {
      TokenMappingTableName: props.tokenMappingTable.tableName,

      // Real endpoints/credentials
      CIS2_USER_INFO_ENDPOINT: props.primaryOidcUserInfoEndpoint,
      CIS2_OIDCJWKS_ENDPOINT: props.primaryOidcjwksEndpoint,
      CIS2_USER_POOL_IDP: props.primaryPoolIdentityProviderName,
      CIS2_OIDC_CLIENT_ID: props.primaryOidcClientId,
      CIS2_OIDC_ISSUER: props.primaryOidcIssuer,

      // Indicate if mock mode is available
      MOCK_MODE_ENABLED: props.useMockOidc ? "true" : "false"
    }

    // If mock OIDC is enabled, add mock environment variables
    if (props.useMockOidc && props.sharedSecrets.mockJwtPrivateKey.secretArn) {
      commonLambdaEnv["MOCK_USER_INFO_ENDPOINT"] = props.mockOidcUserInfoEndpoint!
      commonLambdaEnv["MOCK_OIDCJWKS_ENDPOINT"] = props.mockOidcjwksEndpoint!
      commonLambdaEnv["MOCK_USER_POOL_IDP"] = props.mockPoolIdentityProviderName
      commonLambdaEnv["MOCK_OIDC_CLIENT_ID"] = props.mockOidcClientId!
      commonLambdaEnv["MOCK_OIDC_ISSUER"] = props.mockOidcIssuer!
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
      lambdaEnvironmentVariables: commonLambdaEnv
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(trackerUserInfoLambda.executeLambdaManagedPolicy)

    // Selected Role Lambda Function
    const selectedRoleLambda = new LambdaFunction(this, "SelectedRole", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-selectedRole`,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/selectedRoleLambda",
      entryPoint: "src/handler.ts",
      lambdaEnvironmentVariables: commonLambdaEnv
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(selectedRoleLambda.executeLambdaManagedPolicy)

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
        ...commonLambdaEnv,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
        apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint,
        apigeePrescriptionsEndpoint: props.apigeePrescriptionsEndpoint,
        apigeeApiKey: props.apigeeApiKey,
        jwtKid: props.jwtKid,
        roleId: props.roleId
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

    // Prescription Details Lambda Function
    const prescriptionDetailsLambda = new LambdaFunction(this, "PrescriptionDetails", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-prescDetails`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKmsKeyPolicy,
        props.sharedSecrets.useJwtKmsKeyPolicy,
        props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy,
        props.sharedSecrets.getDoHSApiKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/prescriptionDetailsLambda",
      entryPoint: "src/handler.ts",
      lambdaEnvironmentVariables: {
        ...commonLambdaEnv,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        doHSApiKeyArn: props.sharedSecrets.doHSApiKeySecret.secretArn,
        apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
        apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint,
        apigeePrescriptionsEndpoint: props.apigeePrescriptionsEndpoint,
        apigeeApiKey: props.apigeeApiKey,
        jwtKid: props.jwtKid,
        roleId: props.roleId
      }
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(prescriptionDetailsLambda.executeLambdaManagedPolicy)

    // Outputs
    this.apiFunctionsPolicies = apiFunctionsPolicies
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey
    this.doHSApiKeySecret = props.sharedSecrets.doHSApiKeySecret

    this.prescriptionSearchLambda = prescriptionSearchLambda.lambda
    this.prescriptionDetailsLambda = prescriptionDetailsLambda.lambda
    this.trackerUserInfoLambda = trackerUserInfoLambda.lambda
    this.selectedRoleLambda = selectedRoleLambda.lambda
  }
}
