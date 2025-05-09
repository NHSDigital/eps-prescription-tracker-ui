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

  readonly fullCognitoDomain: string
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
  public readonly tokenLambda: NodejsFunction
  public readonly mockTokenLambda: NodejsFunction

  public constructor(scope: Construct, id: string, props: OAuth2FunctionsProps) {
    super(scope, id)

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
        CIS2_OIDC_CLIENT_ID: props.primaryOidcClientId,
        CIS2_OIDC_ISSUER: props.primaryOidcIssuer,
        COGNITO_DOMAIN: props.fullCognitoDomain,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        jwtKid: props.jwtKid
      }
    })

    // Create the login redirection `authorize` function
    const authorizeLambda = new LambdaFunction(this, "AuthorizeLambdaResources", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-authorize`,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/cognito",
      entryPoint: "src/authorize.ts",
      lambdaEnvironmentVariables: {
        IDP_AUTHORIZE_PATH: props.primaryOidcAuthorizeEndpoint
      }
    })

    // Initialize policies
    const oauth2Policies: Array<IManagedPolicy> = [
      authorizeLambda.executeLambdaManagedPolicy,
      tokenLambda.executeLambdaManagedPolicy
    ]

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

      mockTokenLambda = new LambdaFunction(this, "MockTokenResources", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mock-token`,
        additionalPolicies: [
          props.tokenMappingTableWritePolicy,
          props.tokenMappingTableReadPolicy,
          props.useTokensMappingKmsKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/tokenMock.ts",
        lambdaEnvironmentVariables: {
          TokenMappingTableName: props.tokenMappingTable.tableName,
          MOCK_USER_POOL_IDP: props.mockPoolIdentityProviderName,
          MOCK_OIDCJWKS_ENDPOINT: props.mockOidcjwksEndpoint,
          MOCK_OIDC_CLIENT_ID: props.mockOidcClientId,
          MOCK_OIDC_TOKEN_ENDPOINT: props.mockOidcTokenEndpoint,
          MOCK_USER_INFO_ENDPOINT: props.mockOidcUserInfoEndpoint,
          MOCK_OIDC_ISSUER: props.mockOidcIssuer,
          COGNITO_DOMAIN: props.fullCognitoDomain,
          APIGEE_API_KEY: props.apigeeApiKey,
          APIGEE_API_SECRET: props.apigeeApiSecret
        }
      })

      oauth2Policies.push(
        mockTokenLambda.executeLambdaManagedPolicy
      )

      // Output
      this.mockTokenLambda = mockTokenLambda.lambda
    }

    // Outputs
    this.oAuth2Policies = oauth2Policies
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey

    this.authorizeLambda = authorizeLambda.lambda
    this.tokenLambda = tokenLambda.lambda
  }
}
