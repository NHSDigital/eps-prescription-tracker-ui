import {Construct} from "constructs"
import {LambdaFunction} from "./LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {SharedSecrets} from "./SharedSecrets"

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
  readonly sharedSecrets: SharedSecrets
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
        props.sharedSecrets.useJwtKmsKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      packageBasePath: "packages/cognito",
      entryPoint: "src/token.ts",
      lambdaEnvironmentVariables: {
        idpTokenPath: props.primaryOidcTokenEndpoint,
        TokenMappingTableName: props.tokenMappingTable.tableName,
        UserPoolIdentityProvider: props.primaryPoolIdentityProviderName,
        oidcjwksEndpoint: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        userInfoEndpoint: props.primaryOidcUserInfoEndpoint,
        useSignedJWT: "true",
        oidcClientId: props.primaryOidcClientId,
        oidcIssuer: props.primaryOidcIssuer
      }
    })

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
          props.sharedSecrets.useJwtKmsKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        packageBasePath: "packages/cognito",
        entryPoint: "src/token.ts",
        lambdaEnvironmentVariables: {
          idpTokenPath: props.mockOidcTokenEndpoint,
          TokenMappingTableName: props.tokenMappingTable.tableName,
          UserPoolIdentityProvider: props.mockPoolIdentityProviderName,
          oidcjwksEndpoint: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: props.sharedSecrets.mockJwtPrivateKey!.secretArn,
          userInfoEndpoint: props.mockOidcUserInfoEndpoint,
          useSignedJWT: "true",
          oidcClientId: props.mockOidcClientId,
          oidcIssuer: props.mockOidcIssuer
        }
      })

      cognitoPolicies.push(mockTokenLambda.executeLambdaManagedPolicy)
      this.mockTokenLambda = mockTokenLambda.lambda
    }

    // Outputs
    this.cognitoPolicies = cognitoPolicies
    this.tokenLambda = tokenLambda.lambda
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey
  }
}
