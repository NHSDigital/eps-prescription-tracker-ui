import {Construct} from "constructs"
import {TypescriptLambdaFunction} from "@nhsdigital/eps-cdk-constructs"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {ISecret, Secret} from "aws-cdk-lib/aws-secretsmanager"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {SharedSecrets} from "../SharedSecrets"
import {resolve} from "path"

const baseDir = resolve(__dirname, "../../../..")

export interface OAuth2FunctionsProps {
  readonly serviceName: string
  readonly stackName: string
  readonly fullCloudfrontDomain: string

  readonly fullCognitoDomain: string
  readonly userPoolClientId: string
  readonly primaryPoolIdentityProviderName: string
  readonly mockPoolIdentityProviderName: string

  readonly primaryOidcTokenEndpoint: string
  readonly primaryOidcUserInfoEndpoint: string
  readonly primaryOidcjwksEndpoint: string
  readonly primaryOidcClientId: string
  readonly primaryOidcIssuer: string
  readonly primaryOidcAuthorizeEndpoint: string

  readonly useMockOidc: boolean

  readonly mockOidcTokenEndpoint?: string
  readonly mockOidcUserInfoEndpoint?: string
  readonly mockOidcjwksEndpoint?: string
  readonly mockOidcClientId?: string
  readonly mockOidcIssuer?: string
  readonly mockOidcAuthorizeEndpoint?: string

  readonly tokenMappingTable: ITableV2
  readonly tokenMappingTableWritePolicy: IManagedPolicy
  readonly tokenMappingTableReadPolicy: IManagedPolicy
  readonly useTokensMappingKmsKeyPolicy: IManagedPolicy

  readonly sessionManagementTable: ITableV2
  readonly sessionManagementTableWritePolicy: IManagedPolicy
  readonly sessionManagementTableReadPolicy: IManagedPolicy
  readonly useSessionManagementKmsKeyPolicy: IManagedPolicy

  readonly stateMappingTable: ITableV2
  readonly stateMappingTableWritePolicy: IManagedPolicy
  readonly stateMappingTableReadPolicy: IManagedPolicy
  readonly useStateMappingKmsKeyPolicy: IManagedPolicy

  readonly sessionStateMappingTable: ITableV2
  readonly sessionStateMappingTableWritePolicy: IManagedPolicy
  readonly sessionStateMappingTableReadPolicy: IManagedPolicy
  readonly useSessionStateMappingKmsKeyPolicy: IManagedPolicy

  readonly sharedSecrets: SharedSecrets

  readonly logRetentionInDays: number
  readonly logLevel: string
  readonly jwtKid: string
  readonly apigeeApiKey: ISecret
  readonly apigeeApiSecret: ISecret
  readonly version: string
  readonly commitId: string
}

/**
 * Functions and resources that are needed for OAuth2
 */
export class OAuth2Functions extends Construct {
  public readonly oAuth2Policies: Array<IManagedPolicy>
  public readonly primaryJwtPrivateKey: Secret
  public readonly authorizeLambda: NodejsFunction
  public readonly mockAuthorizeLambda: NodejsFunction
  public readonly callbackLambda: NodejsFunction
  public readonly mockCallbackLambda: NodejsFunction
  public readonly tokenLambda: NodejsFunction
  public readonly mockTokenLambda: NodejsFunction

  public constructor(scope: Construct, id: string, props: OAuth2FunctionsProps) {
    super(scope, id)

    let mockOidcAuthorizeEndpoint
    let mockOidcIssuer
    let mockOidcClientId
    if (props.useMockOidc) {
      mockOidcIssuer = props.mockOidcIssuer as string
      mockOidcAuthorizeEndpoint = props.mockOidcAuthorizeEndpoint as string
      mockOidcClientId = props.mockOidcClientId as string
    } else {
      mockOidcAuthorizeEndpoint = ""
      mockOidcIssuer = ""
      mockOidcClientId = ""
    }

    // Create the token Lambda function
    const tokenLambda = new TypescriptLambdaFunction(this, "TokenResources", {
      functionName: `${props.stackName}-token`,
      projectBaseDir: baseDir,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKmsKeyPolicy,
        props.sharedSecrets.useJwtKmsKeyPolicy,
        props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy,
        props.sessionManagementTableWritePolicy,
        props.sessionManagementTableReadPolicy,
        props.useSessionManagementKmsKeyPolicy,
        props.sharedSecrets.getApigeeSecretsPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/token.ts",
      environmentVariables: {
        TokenMappingTableName: props.tokenMappingTable.tableName,
        SessionManagementTableName: props.sessionManagementTable.tableName,
        CIS2_IDP_TOKEN_PATH: props.primaryOidcTokenEndpoint,
        CIS2_USER_POOL_IDP: props.primaryPoolIdentityProviderName,
        CIS2_OIDCJWKS_ENDPOINT: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        CIS2_OIDC_CLIENT_ID: props.primaryOidcClientId,
        CIS2_OIDC_ISSUER: props.primaryOidcIssuer,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
        jwtKid: props.jwtKid
      },
      version: props.version,
      commitId: props.commitId
    })

    // Create the login redirection `authorize` function
    const authorizeLambda = new TypescriptLambdaFunction(this, "AuthorizeLambdaResources", {
      functionName: `${props.stackName}-authorize`,
      projectBaseDir: baseDir,
      additionalPolicies: [
        props.stateMappingTableWritePolicy,
        props.stateMappingTableReadPolicy,
        props.useStateMappingKmsKeyPolicy,
        props.sharedSecrets.getApigeeSecretsPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/authorize.ts",
      environmentVariables: {
        IDP_AUTHORIZE_PATH: props.primaryOidcAuthorizeEndpoint,
        OIDC_CLIENT_ID: props.primaryOidcClientId,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
        StateMappingTableName: props.stateMappingTable.tableName
      },
      version: props.version,
      commitId: props.commitId
    })

    // This proxy handles the return journey from the IdP login initiated by the authorize lambda
    const callbackLambda = new TypescriptLambdaFunction(this, "CallbackLambdaResources", {
      functionName: `${props.stackName}-callback`,
      projectBaseDir: baseDir,
      additionalPolicies: [
        props.stateMappingTableWritePolicy,
        props.stateMappingTableReadPolicy,
        props.useStateMappingKmsKeyPolicy,
        props.sharedSecrets.getApigeeSecretsPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/callback.ts",
      environmentVariables: {
        StateMappingTableName: props.stateMappingTable.tableName,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        COGNITO_DOMAIN: props.fullCognitoDomain,
        MOCK_OIDC_ISSUER: mockOidcIssuer,
        PRIMARY_OIDC_ISSUER: props.primaryOidcIssuer
      },
      version: props.version,
      commitId: props.commitId
    })

    // Initialize policies
    const oauth2Policies: Array<IManagedPolicy> = [
      authorizeLambda.executionPolicy,
      callbackLambda.executionPolicy,
      tokenLambda.executionPolicy
    ]

    let mockAuthorizeLambda: TypescriptLambdaFunction
    let mockTokenLambda: TypescriptLambdaFunction
    if (props.useMockOidc) {
      if (
        !props.mockOidcjwksEndpoint ||
        !props.mockOidcTokenEndpoint ||
        !props.mockOidcUserInfoEndpoint ||
        !props.mockOidcClientId ||
        !props.mockOidcIssuer
      ) {
        throw new Error("Missing mock OIDC configuration.")
      }

      mockAuthorizeLambda = new TypescriptLambdaFunction(this, "MockAuthorizeLambdaResources", {
        functionName: `${props.stackName}-mock-authorize`,
        projectBaseDir: baseDir,
        additionalPolicies: [
          props.stateMappingTableWritePolicy,
          props.stateMappingTableReadPolicy,
          props.useStateMappingKmsKeyPolicy,
          props.sessionStateMappingTableWritePolicy,
          props.sessionStateMappingTableReadPolicy,
          props.useSessionStateMappingKmsKeyPolicy,
          props.sharedSecrets.getApigeeSecretsPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/authorizeMock.ts",
        environmentVariables: {
          IDP_AUTHORIZE_PATH: mockOidcAuthorizeEndpoint,
          OIDC_CLIENT_ID: mockOidcClientId,
          COGNITO_CLIENT_ID: props.userPoolClientId,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
          StateMappingTableName: props.stateMappingTable.tableName,
          SessionStateMappingTableName: props.sessionStateMappingTable.tableName,
          APIGEE_API_KEY_ARN: props.apigeeApiKey.secretArn
        },
        version: props.version,
        commitId: props.commitId
      })

      oauth2Policies.push(
        mockAuthorizeLambda.executionPolicy
      )

      mockTokenLambda = new TypescriptLambdaFunction(this, "MockTokenResources", {
        functionName: `${props.stackName}-mock-token`,
        projectBaseDir: baseDir,
        additionalPolicies: [
          props.tokenMappingTableWritePolicy,
          props.tokenMappingTableReadPolicy,
          props.useTokensMappingKmsKeyPolicy,
          props.sessionManagementTableWritePolicy,
          props.sessionManagementTableReadPolicy,
          props.useSessionManagementKmsKeyPolicy,
          props.stateMappingTableReadPolicy,
          props.stateMappingTableWritePolicy,
          props.useStateMappingKmsKeyPolicy,
          props.sessionStateMappingTableReadPolicy,
          props.sessionStateMappingTableWritePolicy,
          props.useSessionStateMappingKmsKeyPolicy,
          props.sharedSecrets.useJwtKmsKeyPolicy,
          props.sharedSecrets.getMockJwtPrivateKeyPolicy,
          props.sharedSecrets.getApigeeSecretsPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/tokenMock.ts",
        environmentVariables: {
          TokenMappingTableName: props.tokenMappingTable.tableName,
          SessionManagementTableName: props.sessionManagementTable.tableName,
          SessionStateMappingTableName: props.sessionStateMappingTable.tableName,
          StateMappingTableName: props.stateMappingTable.tableName,
          MOCK_IDP_TOKEN_PATH: props.mockOidcTokenEndpoint,
          MOCK_USER_POOL_IDP: props.mockPoolIdentityProviderName,
          MOCK_OIDCJWKS_ENDPOINT: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: props.sharedSecrets.mockJwtPrivateKey!.secretArn,
          MOCK_OIDC_CLIENT_ID: props.mockOidcClientId,
          MOCK_OIDC_TOKEN_ENDPOINT: props.mockOidcTokenEndpoint,
          MOCK_USER_INFO_ENDPOINT: props.mockOidcUserInfoEndpoint,
          MOCK_OIDC_ISSUER: props.mockOidcIssuer,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
          jwtKid: props.jwtKid,
          APIGEE_API_KEY_ARN: props.apigeeApiKey.secretArn,
          APIGEE_API_SECRET_ARN: props.apigeeApiSecret.secretArn
        },
        version: props.version,
        commitId: props.commitId
      })

      oauth2Policies.push(
        mockTokenLambda.executionPolicy
      )

      const mockCallbackLambda = new TypescriptLambdaFunction(this, "MockCallbackLambdaResources", {
        functionName: `${props.stackName}-mock-callback`,
        projectBaseDir: baseDir,
        additionalPolicies: [
          props.stateMappingTableWritePolicy,
          props.stateMappingTableReadPolicy,
          props.useStateMappingKmsKeyPolicy,
          props.sessionStateMappingTableReadPolicy,
          props.sessionStateMappingTableWritePolicy,
          props.useSessionStateMappingKmsKeyPolicy,
          props.sharedSecrets.getApigeeSecretsPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/callbackMock.ts",
        environmentVariables: {
          StateMappingTableName: props.stateMappingTable.tableName,
          SessionStateMappingTableName: props.sessionStateMappingTable.tableName,
          COGNITO_CLIENT_ID: props.userPoolClientId,
          COGNITO_DOMAIN: props.fullCognitoDomain,
          MOCK_OIDC_ISSUER: mockOidcIssuer,
          PRIMARY_OIDC_ISSUER: props.primaryOidcIssuer
        },
        version: props.version,
        commitId: props.commitId
      })

      oauth2Policies.push(
        mockCallbackLambda.executionPolicy
      )

      // Output
      this.mockAuthorizeLambda = mockAuthorizeLambda.function
      this.mockTokenLambda = mockTokenLambda.function
      this.mockCallbackLambda = mockCallbackLambda.function
    }

    // Outputs
    this.oAuth2Policies = oauth2Policies
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey

    this.authorizeLambda = authorizeLambda.function
    this.callbackLambda = callbackLambda.function
    this.tokenLambda = tokenLambda.function
  }
}
