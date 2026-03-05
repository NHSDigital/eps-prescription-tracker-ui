import {Construct} from "constructs"
import {TypescriptLambdaFunction} from "@nhsdigital/eps-cdk-constructs"
import {SharedSecrets} from "../SharedSecrets"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {ISecret, Secret} from "aws-cdk-lib/aws-secretsmanager"
import {resolve} from "path"

const baseDir = resolve(__dirname, "../../../..")

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
  readonly sessionManagementTable: ITableV2
  readonly sessionManagementTableWritePolicy: IManagedPolicy
  readonly sessionManagementTableReadPolicy: IManagedPolicy
  readonly useSessionManagementKmsKeyPolicy: IManagedPolicy
  readonly primaryPoolIdentityProviderName: string
  readonly mockPoolIdentityProviderName: string
  readonly logRetentionInDays: number
  readonly sharedSecrets: SharedSecrets
  readonly apigeeCIS2TokenEndpoint: string
  readonly apigeeMockTokenEndpoint: string
  readonly apigeeDoHSEndpoint: string
  readonly apigeePrescriptionsEndpoint: string
  readonly apigeePersonalDemographicsEndpoint: string
  readonly apigeeApiKey: ISecret
  readonly apigeeApiSecret: ISecret
  readonly apigeeDoHSApiKey: ISecret
  readonly jwtKid: string
  readonly logLevel: string
  readonly roleId: string
  readonly fullCloudfrontDomain: string
  readonly version: string
  readonly commitId: string
}

/**
 * Class for creating functions and resources needed for API operations
 */
export class ApiFunctions extends Construct {
  public readonly apiFunctionsPolicies: Array<IManagedPolicy>
  public readonly CIS2SignOutLambda: NodejsFunction
  public readonly prescriptionListLambda: NodejsFunction
  public readonly prescriptionDetailsLambda: NodejsFunction
  public readonly trackerUserInfoLambda: NodejsFunction
  public readonly sessionManagementLambda: NodejsFunction
  public readonly selectedRoleLambda: NodejsFunction
  public readonly patientSearchLambda: NodejsFunction
  public readonly primaryJwtPrivateKey: Secret
  public readonly clearActiveSessionLambda: NodejsFunction

  public constructor(scope: Construct, id: string, props: ApiFunctionsProps) {
    super(scope, id)

    // Permissions for API Gateway to execute lambdas
    const apiFunctionsPolicies: Array<IManagedPolicy> = []

    // Combine policies
    const additionalPolicies = [
      props.tokenMappingTableWritePolicy,
      props.tokenMappingTableReadPolicy,
      props.useTokensMappingKmsKeyPolicy,
      props.sessionManagementTableWritePolicy,
      props.sessionManagementTableReadPolicy,
      props.useSessionManagementKmsKeyPolicy,
      props.sharedSecrets.useJwtKmsKeyPolicy,
      props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy,
      props.sharedSecrets.getApigeeSecretsPolicy
    ]

    if (props.useMockOidc && props.sharedSecrets.getMockJwtPrivateKeyPolicy) {
      additionalPolicies.push(props.sharedSecrets.getMockJwtPrivateKeyPolicy)
    }

    // Environment variables
    // We pass in both sets of endpoints and keys. The Lambda code determines at runtime which to use.
    const commonLambdaEnv: {[key: string]: string} = {
      TokenMappingTableName: props.tokenMappingTable.tableName,
      SessionManagementTableName: props.sessionManagementTable.tableName,

      // Real endpoints/credentials
      CIS2_USER_INFO_ENDPOINT: props.primaryOidcUserInfoEndpoint,
      CIS2_OIDCJWKS_ENDPOINT: props.primaryOidcjwksEndpoint,
      CIS2_USER_POOL_IDP: props.primaryPoolIdentityProviderName,
      CIS2_OIDC_CLIENT_ID: props.primaryOidcClientId,
      CIS2_OIDC_ISSUER: props.primaryOidcIssuer,

      // Indicate if mock mode is available
      MOCK_MODE_ENABLED: props.useMockOidc ? "true" : "false",

      APIGEE_API_SECRET_ARN: props.apigeeApiSecret.secretArn,
      APIGEE_API_KEY_ARN: props.apigeeApiKey.secretArn,
      FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain
    }

    // If mock OIDC is enabled, add mock environment variables
    if (props.useMockOidc && props.sharedSecrets.mockJwtPrivateKey.secretArn) {
      commonLambdaEnv["MOCK_USER_INFO_ENDPOINT"] = props.mockOidcUserInfoEndpoint!
      commonLambdaEnv["MOCK_OIDCJWKS_ENDPOINT"] = props.mockOidcjwksEndpoint!
      commonLambdaEnv["MOCK_USER_POOL_IDP"] = props.mockPoolIdentityProviderName
      commonLambdaEnv["MOCK_OIDC_CLIENT_ID"] = props.mockOidcClientId!
      commonLambdaEnv["MOCK_OIDC_ISSUER"] = props.mockOidcIssuer!
    }

    // Prescription Search Lambda Function
    const CIS2SignOutLambda = new TypescriptLambdaFunction(this, "CIS2SignOut", {
      functionName: `${props.stackName}-CIS2SignOut`,
      projectBaseDir: baseDir,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/CIS2SignOutLambda",
      entryPoint: "src/handler.ts",
      environmentVariables: commonLambdaEnv,
      version: props.version,
      commitId: props.commitId
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(CIS2SignOutLambda.executionPolicy)

    // Single Lambda for both real and mock scenarios
    const trackerUserInfoLambda = new TypescriptLambdaFunction(this, "TrackerUserInfo", {
      functionName: `${props.stackName}-TrkUsrInfo`,
      projectBaseDir: baseDir,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/trackerUserInfoLambda",
      entryPoint: "src/handler.ts",
      environmentVariables: {
        ...commonLambdaEnv,
        jwtKid: props.jwtKid,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
        apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint
      },
      version: props.version,
      commitId: props.commitId
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(trackerUserInfoLambda.executionPolicy)

    // Single Lambda for both real and mock scenarios
    const sessionManagementLambda = new TypescriptLambdaFunction(this, "SessionMgmt", {
      functionName: `${props.stackName}-SessionMgmt`,
      projectBaseDir: baseDir,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/sessionManagementLambda",
      entryPoint: "src/handler.ts",
      environmentVariables: {
        ...commonLambdaEnv
      },
      version: props.version,
      commitId: props.commitId
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(sessionManagementLambda.executionPolicy)

    // Selected Role Lambda Function
    const selectedRoleLambda = new TypescriptLambdaFunction(this, "SelectedRole", {
      functionName: `${props.stackName}-selectedRole`,
      projectBaseDir: baseDir,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/selectedRoleLambda",
      entryPoint: "src/handler.ts",
      environmentVariables: {
        ...commonLambdaEnv,
        apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
        apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint
      },
      version: props.version,
      commitId: props.commitId
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(selectedRoleLambda.executionPolicy)

    // Prescription List Lambda Function
    const prescriptionListLambda = new TypescriptLambdaFunction(this, "PrescriptionList", {
      functionName: `${props.stackName}-prescList`,
      projectBaseDir: baseDir,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/prescriptionListLambda",
      entryPoint: "src/handler.ts",
      environmentVariables: {
        ...commonLambdaEnv,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
        apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint,
        apigeePrescriptionsEndpoint: props.apigeePrescriptionsEndpoint,
        apigeePersonalDemographicsEndpoint: props.apigeePersonalDemographicsEndpoint,
        jwtKid: props.jwtKid,
        roleId: props.roleId
      },
      version: props.version,
      commitId: props.commitId
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(prescriptionListLambda.executionPolicy)

    const patientSearchLambda = new TypescriptLambdaFunction(this, "PatientSearch", {
      functionName: `${props.stackName}-patientSearch`,
      projectBaseDir: baseDir,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/patientSearchLambda",
      entryPoint: "src/index.ts",
      environmentVariables: {
        ...commonLambdaEnv,
        TokenMappingTableName: props.tokenMappingTable.tableName,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
        apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint,
        apigeePersonalDemographicsEndpoint: props.apigeePersonalDemographicsEndpoint,
        jwtKid: props.jwtKid
      },
      version: props.version,
      commitId: props.commitId
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(patientSearchLambda.executionPolicy)

    // Prescription Details Lambda Function
    const prescriptionDetailsLambda = new TypescriptLambdaFunction(this, "PrescriptionDetails", {
      functionName: `${props.stackName}-prescDetails`,
      projectBaseDir: baseDir,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/prescriptionDetailsLambda",
      entryPoint: "src/handler.ts",
      environmentVariables: {
        ...commonLambdaEnv,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
        apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint,
        apigeePrescriptionsEndpoint: props.apigeePrescriptionsEndpoint,
        apigeeDoHSEndpoint: props.apigeeDoHSEndpoint,
        apigeePersonalDemographicsEndpoint: props.apigeePersonalDemographicsEndpoint,
        jwtKid: props.jwtKid,
        roleId: props.roleId,
        APIGEE_DOHS_API_KEY_ARN: props.apigeeDoHSApiKey.secretArn
      },
      version: props.version,
      commitId: props.commitId
    })

    // Add the policy to apiFunctionsPolicies
    apiFunctionsPolicies.push(prescriptionDetailsLambda.executionPolicy)

    if (props.useMockOidc) {
      const clearActiveSessionLambda = new TypescriptLambdaFunction(this, "ClearActiveSessions", {
        functionName: `${props.stackName}-clr-active`,
        projectBaseDir: baseDir,
        additionalPolicies: additionalPolicies,
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/testingSupport/clearActiveSessions",
        entryPoint: "src/handler.ts",
        environmentVariables: {
          ...commonLambdaEnv,
          TokenMappingTableName: props.tokenMappingTable.tableName,
          SessionManagementTableName: props.sessionManagementTable.tableName
        },
        version: props.version,
        commitId: props.commitId
      })

      // Add the policy to apiFunctionsPolicies
      apiFunctionsPolicies.push(clearActiveSessionLambda.executionPolicy)

      this.clearActiveSessionLambda = clearActiveSessionLambda.function
    }

    // Outputs
    this.apiFunctionsPolicies = apiFunctionsPolicies
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey

    this.CIS2SignOutLambda = CIS2SignOutLambda.function
    this.prescriptionListLambda = prescriptionListLambda.function
    this.prescriptionDetailsLambda = prescriptionDetailsLambda.function
    this.trackerUserInfoLambda = trackerUserInfoLambda.function
    this.sessionManagementLambda = sessionManagementLambda.function
    this.selectedRoleLambda = selectedRoleLambda.function
    this.patientSearchLambda = patientSearchLambda.function
  }
}
