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
  readonly fullCloudfrontDomain: string
  readonly userPoolClientId: string
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
  readonly stateMappingTable: ITableV2
  readonly stateMappingTableWritePolicy: IManagedPolicy
  readonly stateMappingTableReadPolicy: IManagedPolicy
  readonly useStateMappingKmsKeyPolicy: IManagedPolicy
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
  public readonly authorizeLambda: NodejsFunction
  public readonly mockAuthorizeLambda: NodejsFunction
  public readonly idpResponseLambda: NodejsFunction
  public readonly mockIdpResponseLambda: NodejsFunction
  public readonly tokenLambda: NodejsFunction
  public readonly mockTokenLambda: NodejsFunction
  public readonly primaryJwtPrivateKey: Secret

  public constructor(scope: Construct, id: string, props: CognitoFunctionsProps) {
    super(scope, id)

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
      packageBasePath: "packages/proxyLoginLambda",
      entryPoint: "src/index.ts",
      lambdaEnvironmentVariables: {
        StateMappingTableName: props.stateMappingTable.tableName,
        CIS2_OIDC_CLIENT_ID: props.primaryOidcClientId,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
        CIS2_IDP_TOKEN_PATH: props.primaryOidcTokenEndpoint
      }
    })

    // This proxy handles the return journey from the IdP login initiated by the authorize lambda
    const IdpResponseLambda = new LambdaFunction(this, "IDPResponseLambdaResources", {
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
        // FIXME: Change this to be a prop or not needed!
        COGNITO_IDP_RESPONSE_URI: `https://${props.stackName}/site/`
      }
    })

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
    const cognitoPolicies: Array<IManagedPolicy> = [
      tokenLambda.executeLambdaManagedPolicy,
      authorizeLambda.executeLambdaManagedPolicy,
      IdpResponseLambda.executeLambdaManagedPolicy
    ]

    // If mock OIDC is enabled, configure mock token Lambda
    let mockTokenLambda: LambdaFunction | undefined
    let mockAuthorizeLambda: LambdaFunction | undefined
    let mockIdpResponseLambda: LambdaFunction | undefined
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

      // Create the mock login redirection `authorize` function
      mockAuthorizeLambda = new LambdaFunction(this, "MockAuthorizeLambdaResources", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mock-authorize`,
        additionalPolicies: [
          props.stateMappingTableWritePolicy,
          props.stateMappingTableReadPolicy,
          props.useStateMappingKmsKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/proxyLoginLambda",
        entryPoint: "src/index.ts",
        lambdaEnvironmentVariables: {
          StateMappingTableName: props.stateMappingTable.tableName,
          CIS2_OIDC_CLIENT_ID: props.mockOidcClientId,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
          CIS2_IDP_TOKEN_PATH: props.mockOidcTokenEndpoint
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
          // FIXME: Change this to be a prop or not needed!
          COGNITO_IDP_RESPONSE_URI: `https://${props.stackName}/site/`
        }
      })

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
      cognitoPolicies.push(mockAuthorizeLambda.executeLambdaManagedPolicy)
      cognitoPolicies.push(mockIdpResponseLambda.executeLambdaManagedPolicy)
      this.mockTokenLambda = mockTokenLambda.lambda
      this.mockAuthorizeLambda = mockAuthorizeLambda.lambda
      this.mockIdpResponseLambda = mockIdpResponseLambda.lambda
    }

    // Outputs
    this.cognitoPolicies = cognitoPolicies
    this.authorizeLambda = authorizeLambda.lambda
    this.idpResponseLambda = IdpResponseLambda.lambda
    this.tokenLambda = tokenLambda.lambda
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey
  }
}
