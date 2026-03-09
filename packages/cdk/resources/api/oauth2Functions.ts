import {Construct} from "constructs"
import {TypescriptLambdaFunction} from "@nhsdigital/eps-cdk-constructs"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {ISecret, Secret} from "aws-cdk-lib/aws-secretsmanager"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {SharedSecrets} from "../SharedSecrets"
import {resolve} from "path"
import {Dynamodb} from "../Dynamodb"
import {OidcConfig, Cognito} from "../Cognito"

const baseDir = resolve(__dirname, "../../../..")

export interface OAuth2FunctionsProps {
  readonly serviceName: string
  readonly stackName: string
  readonly fullCloudfrontDomain: string

  readonly fullCognitoDomain: string
  readonly cognito: Cognito

  readonly primaryOidcConfig: OidcConfig
  readonly mockOidcConfig?: OidcConfig

  readonly dynamodb: Dynamodb

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

    // Create the token Lambda function
    const tokenLambda = new TypescriptLambdaFunction(this, "TokenResources", {
      functionName: `${props.stackName}-token`,
      projectBaseDir: baseDir,
      additionalPolicies: [
        props.dynamodb.tokenMappingTableWritePolicy,
        props.dynamodb.tokenMappingTableReadPolicy,
        props.dynamodb.useTokensMappingKmsKeyPolicy,
        props.sharedSecrets.useJwtKmsKeyPolicy,
        props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy,
        props.dynamodb.sessionManagementTableWritePolicy,
        props.dynamodb.sessionManagementTableReadPolicy,
        props.dynamodb.useSessionManagementTableKmsKeyPolicy,
        props.sharedSecrets.getApigeeSecretsPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/token.ts",
      environmentVariables: {
        TokenMappingTableName: props.dynamodb.tokenMappingTable.tableName,
        SessionManagementTableName: props.dynamodb.sessionManagementTable.tableName,
        CIS2_IDP_TOKEN_PATH: props.primaryOidcConfig.tokenEndpoint,
        CIS2_USER_POOL_IDP: props.cognito.primaryPoolIdentityProvider.providerName,
        CIS2_OIDCJWKS_ENDPOINT: props.primaryOidcConfig.jwksEndpoint,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        CIS2_OIDC_CLIENT_ID: props.primaryOidcConfig.clientId,
        CIS2_OIDC_ISSUER: props.primaryOidcConfig.issuer,
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
        props.sharedSecrets.getApigeeSecretsPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/authorize.ts",
      environmentVariables: {
        IDP_AUTHORIZE_PATH: props.primaryOidcConfig.authorizeEndpoint,
        OIDC_CLIENT_ID: props.primaryOidcConfig.clientId,
        COGNITO_CLIENT_ID: props.cognito.userPoolClient.userPoolClientId,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain
      },
      version: props.version,
      commitId: props.commitId
    })

    // This proxy handles the return journey from the IdP login initiated by the authorize lambda
    const callbackLambda = new TypescriptLambdaFunction(this, "CallbackLambdaResources", {
      functionName: `${props.stackName}-callback`,
      projectBaseDir: baseDir,
      additionalPolicies: [
        props.sharedSecrets.getApigeeSecretsPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/callback.ts",
      environmentVariables: {
        COGNITO_CLIENT_ID: props.cognito.userPoolClient.userPoolClientId,
        COGNITO_DOMAIN: props.fullCognitoDomain,
        MOCK_OIDC_ISSUER: props.mockOidcConfig?.issuer || "",
        PRIMARY_OIDC_ISSUER: props.primaryOidcConfig.issuer
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
    if (props.mockOidcConfig) {
      mockAuthorizeLambda = new TypescriptLambdaFunction(this, "MockAuthorizeLambdaResources", {
        functionName: `${props.stackName}-mock-authorize`,
        projectBaseDir: baseDir,
        additionalPolicies: [
          props.sharedSecrets.getApigeeSecretsPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/authorizeMock.ts",
        environmentVariables: {
          IDP_AUTHORIZE_PATH: props.mockOidcConfig.authorizeEndpoint,
          OIDC_CLIENT_ID: props.mockOidcConfig.clientId,
          COGNITO_CLIENT_ID: props.cognito.userPoolClient.userPoolClientId,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
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
          props.dynamodb.tokenMappingTableWritePolicy,
          props.dynamodb.tokenMappingTableReadPolicy,
          props.dynamodb.useTokensMappingKmsKeyPolicy,
          props.dynamodb.sessionManagementTableWritePolicy,
          props.dynamodb.sessionManagementTableReadPolicy,
          props.dynamodb.useSessionManagementTableKmsKeyPolicy,
          props.sharedSecrets.useJwtKmsKeyPolicy,
          props.sharedSecrets.getMockJwtPrivateKeyPolicy,
          props.sharedSecrets.getApigeeSecretsPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/tokenMock.ts",
        environmentVariables: {
          TokenMappingTableName: props.dynamodb.tokenMappingTable.tableName,
          SessionManagementTableName: props.dynamodb.sessionManagementTable.tableName,
          MOCK_IDP_TOKEN_PATH: props.mockOidcConfig.tokenEndpoint,
          MOCK_USER_POOL_IDP: props.cognito.mockPoolIdentityProvider!.providerName,
          MOCK_OIDCJWKS_ENDPOINT: props.mockOidcConfig.jwksEndpoint,
          jwtPrivateKeyArn: props.sharedSecrets.mockJwtPrivateKey!.secretArn,
          MOCK_OIDC_CLIENT_ID: props.mockOidcConfig.clientId,
          MOCK_OIDC_TOKEN_ENDPOINT: props.mockOidcConfig.tokenEndpoint,
          MOCK_USER_INFO_ENDPOINT: props.mockOidcConfig.userInfoEndpoint,
          MOCK_OIDC_ISSUER: props.mockOidcConfig.issuer,
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
          props.sharedSecrets.getApigeeSecretsPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/callbackMock.ts",
        environmentVariables: {
          COGNITO_CLIENT_ID: props.cognito.userPoolClient.userPoolClientId,
          COGNITO_DOMAIN: props.fullCognitoDomain,
          MOCK_OIDC_ISSUER: props.mockOidcConfig.issuer,
          PRIMARY_OIDC_ISSUER: props.primaryOidcConfig.issuer
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
