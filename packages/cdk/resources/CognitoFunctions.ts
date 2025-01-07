import {Construct} from "constructs"
import {LambdaFunction} from "./LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {SharedSecrets} from "./SharedSecrets"
import {NagSuppressions} from "cdk-nag"

export interface CognitoFunctionsProps {
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
  readonly logLevel: string
  readonly sharedSecrets: SharedSecrets
  readonly jwtKid: string
}

/**
 * Functions and resources that are needed for Cognito
 */
export class CognitoFunctions extends Construct {
  public readonly cognitoPolicies: Array<IManagedPolicy>
  public readonly tokenLambda: NodejsFunction
  public readonly mockTokenLambda: NodejsFunction
  public readonly primaryJwtPrivateKey: Secret

  public constructor(scope: Construct, id: string, props: CognitoFunctionsProps) {
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
        REAL_IDP_TOKEN_PATH: props.primaryOidcTokenEndpoint,
        REAL_USER_POOL_IDP: props.primaryPoolIdentityProviderName,
        REAL_OIDCJWKS_ENDPOINT: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        useSignedJWT: "true",
        REAL_OIDC_CLIENT_ID: props.primaryOidcClientId,
        REAL_OIDC_ISSUER: props.primaryOidcIssuer,
        jwtKid: props.jwtKid,
        useMock: "false"
      }
    })

    // Suppress the AwsSolutions-L1 rule for the token Lambda function
    NagSuppressions.addResourceSuppressions(tokenLambda.lambda, [
      {
        id: "AwsSolutions-L1",
        reason: "The Lambda function uses the latest runtime version supported at the time of implementation."
      }
    ])

    // Initialize policies
    const cognitoPolicies: Array<IManagedPolicy> = [tokenLambda.executeLambdaManagedPolicy]

    // If mock OIDC is enabled, configure mock token Lambda
    let mockTokenLambda: LambdaFunction | undefined
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
          props.useTokensMappingKmsKeyPolicy,
          props.sharedSecrets.useJwtKmsKeyPolicy,
          props.sharedSecrets.getMockJwtPrivateKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/cognito",
        entryPoint: "src/token.ts",
        lambdaEnvironmentVariables: {
          TokenMappingTableName: props.tokenMappingTable.tableName,
          MOCK_IDP_TOKEN_PATH: props.mockOidcTokenEndpoint,
          MOCK_USER_POOL_IDP: props.mockPoolIdentityProviderName,
          MOCK_OIDCJWKS_ENDPOINT: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: props.sharedSecrets.mockJwtPrivateKey!.secretArn,
          useSignedJWT: "true",
          MOCK_OIDC_CLIENT_ID: props.mockOidcClientId,
          MOCK_OIDC_ISSUER: props.mockOidcIssuer,
          jwtKid: props.jwtKid,
          useMock: "true"
        }
      })

      // Suppress the AwsSolutions-L1 rule for the mock token Lambda function
      NagSuppressions.addResourceSuppressions(mockTokenLambda.lambda, [
        {
          id: "AwsSolutions-L1",
          reason: "The Lambda function uses the latest runtime version supported at the time of implementation."
        }
      ])

      cognitoPolicies.push(mockTokenLambda.executeLambdaManagedPolicy)
      this.mockTokenLambda = mockTokenLambda.lambda
    }

    // Outputs
    this.cognitoPolicies = cognitoPolicies
    this.tokenLambda = tokenLambda.lambda
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey
  }
}
