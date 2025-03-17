import {Construct} from "constructs"
import {LambdaFunction} from "../LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {SharedSecrets} from "../SharedSecrets"

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
  readonly apigeeApiKey: string
  readonly apigeeApiSecret: string
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
    const tokenLambda = new LambdaFunction(this, "TokenResources", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-token`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKmsKeyPolicy,
        props.sharedSecrets.useJwtKmsKeyPolicy,
        props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/token.ts",
      lambdaEnvironmentVariables: {
        TokenMappingTableName: props.tokenMappingTable.tableName,
        CIS2_IDP_TOKEN_PATH: props.primaryOidcTokenEndpoint,
        CIS2_USER_POOL_IDP: props.primaryPoolIdentityProviderName,
        CIS2_OIDCJWKS_ENDPOINT: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        CIS2_OIDC_CLIENT_ID: props.primaryOidcClientId,
        CIS2_OIDC_ISSUER: props.primaryOidcIssuer,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
        jwtKid: props.jwtKid
      }
    })

    // Create the login redirection `authorize` function
    const authorizeLambda = new LambdaFunction(this, "AuthorizeLambdaResources", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-authorize`,
      additionalPolicies: [
        props.stateMappingTableWritePolicy,
        props.stateMappingTableReadPolicy,
        props.useStateMappingKmsKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/authorize.ts",
      lambdaEnvironmentVariables: {
        IDP_AUTHORIZE_PATH: props.primaryOidcAuthorizeEndpoint,
        OIDC_CLIENT_ID: props.primaryOidcClientId,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
        StateMappingTableName: props.stateMappingTable.tableName
      }
    })

    // This proxy handles the return journey from the IdP login initiated by the authorize lambda
    const callbackLambda = new LambdaFunction(this, "CallbackLambdaResources", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-callback`,
      additionalPolicies: [
        props.stateMappingTableWritePolicy,
        props.stateMappingTableReadPolicy,
        props.useStateMappingKmsKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/callback.ts",
      lambdaEnvironmentVariables: {
        StateMappingTableName: props.stateMappingTable.tableName,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        COGNITO_DOMAIN: props.fullCognitoDomain,
        MOCK_OIDC_ISSUER: mockOidcIssuer,
        PRIMARY_OIDC_ISSUER: props.primaryOidcIssuer
      }
    })

    // Initialize policies
    const oauth2Policies: Array<IManagedPolicy> = [
      authorizeLambda.executeLambdaManagedPolicy,
      callbackLambda.executeLambdaManagedPolicy,
      tokenLambda.executeLambdaManagedPolicy
    ]

    let mockAuthorizeLambda: LambdaFunction
    let mockTokenLambda: LambdaFunction
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

      mockAuthorizeLambda = new LambdaFunction(this, "MockAuthorizeLambdaResources", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mock-authorize`,
        additionalPolicies: [
          props.stateMappingTableWritePolicy,
          props.stateMappingTableReadPolicy,
          props.useStateMappingKmsKeyPolicy,
          props.sessionStateMappingTableWritePolicy,
          props.sessionStateMappingTableReadPolicy,
          props.useSessionStateMappingKmsKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/authorizeMock.ts",
        lambdaEnvironmentVariables: {
          IDP_AUTHORIZE_PATH: mockOidcAuthorizeEndpoint,
          OIDC_CLIENT_ID: mockOidcClientId,
          COGNITO_CLIENT_ID: props.userPoolClientId,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
          StateMappingTableName: props.stateMappingTable.tableName,
          SessionStateMappingTableName: props.sessionStateMappingTable.tableName,
          APIGEE_API_KEY: props.apigeeApiKey
        }
      })

      oauth2Policies.push(
        mockAuthorizeLambda.executeLambdaManagedPolicy
      )

      mockTokenLambda = new LambdaFunction(this, "MockTokenResources", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mock-token`,
        additionalPolicies: [
          props.tokenMappingTableWritePolicy,
          props.tokenMappingTableReadPolicy,
          props.useTokensMappingKmsKeyPolicy,
          props.stateMappingTableReadPolicy,
          props.stateMappingTableWritePolicy,
          props.useStateMappingKmsKeyPolicy,
          props.sessionStateMappingTableReadPolicy,
          props.sessionStateMappingTableWritePolicy,
          props.useSessionStateMappingKmsKeyPolicy,
          props.sharedSecrets.useJwtKmsKeyPolicy,
          props.sharedSecrets.getMockJwtPrivateKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/tokenMock.ts",
        lambdaEnvironmentVariables: {
          TokenMappingTableName: props.tokenMappingTable.tableName,
          SessionStateMappingTableName: props.sessionStateMappingTable.tableName,
          StateMappingTableName: props.stateMappingTable.tableName,
          MOCK_IDP_TOKEN_PATH: props.mockOidcTokenEndpoint,
          MOCK_USER_POOL_IDP: props.mockPoolIdentityProviderName,
          MOCK_OIDCJWKS_ENDPOINT: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: props.sharedSecrets.mockJwtPrivateKey!.secretArn,
          MOCK_OIDC_CLIENT_ID: props.mockOidcClientId,
          MOCK_OIDC_ISSUER: props.mockOidcIssuer,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
          jwtKid: props.jwtKid,
          APIGEE_API_KEY: props.apigeeApiKey,
          APIGEE_API_SECRET: props.apigeeApiSecret
        }
      })

      oauth2Policies.push(
        mockTokenLambda.executeLambdaManagedPolicy
      )

      const mockCallbackLambda = new LambdaFunction(this, "MockCallbackLambdaResources", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mock-callback`,
        additionalPolicies: [
          props.stateMappingTableWritePolicy,
          props.stateMappingTableReadPolicy,
          props.useStateMappingKmsKeyPolicy,
          props.sessionStateMappingTableReadPolicy,
          props.sessionStateMappingTableWritePolicy,
          props.useSessionStateMappingKmsKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/callbackMock.ts",
        lambdaEnvironmentVariables: {
          StateMappingTableName: props.stateMappingTable.tableName,
          SessionStateMappingTableName: props.sessionStateMappingTable.tableName,
          COGNITO_CLIENT_ID: props.userPoolClientId,
          COGNITO_DOMAIN: props.fullCognitoDomain,
          MOCK_OIDC_ISSUER: mockOidcIssuer,
          PRIMARY_OIDC_ISSUER: props.primaryOidcIssuer
        }
      })

      oauth2Policies.push(
        mockCallbackLambda.executeLambdaManagedPolicy
      )

      // Output
      this.mockAuthorizeLambda = mockAuthorizeLambda.lambda
      this.mockTokenLambda = mockTokenLambda.lambda
      this.mockCallbackLambda = mockCallbackLambda.lambda
    }

    // Outputs
    this.oAuth2Policies = oauth2Policies
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey

    this.authorizeLambda = authorizeLambda.lambda
    this.callbackLambda = callbackLambda.lambda
    this.tokenLambda = tokenLambda.lambda
  }
}
