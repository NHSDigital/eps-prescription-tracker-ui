import {Construct} from "constructs"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy, ManagedPolicy, PolicyStatement} from "aws-cdk-lib/aws-iam"
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

  public constructor(scope: Construct, id: string, props: CognitoFunctionsProps) {
    super(scope, id)

    const {sharedSecrets} = props

    // Lambda environment variables for the token lambda
    const tokenLambdaEnvironment = {
      idpTokenPath: props.primaryOidcTokenEndpoint,
      TokenMappingTableName: props.tokenMappingTable.tableName,
      UserPoolIdentityProvider: props.primaryPoolIdentityProviderName,
      oidcjwksEndpoint: props.primaryOidcjwksEndpoint,
      jwtPrivateKeyArn: sharedSecrets.primaryJwtPrivateKey.secretArn,
      userInfoEndpoint: props.primaryOidcUserInfoEndpoint,
      useSignedJWT: "true",
      oidcClientId: props.primaryOidcClientId,
      oidcIssuer: props.primaryOidcIssuer
    }

    // Create the token lambda
    const tokenLambda = new NodejsFunction(this, "TokenLambda", {
      entry: "src/token.ts",
      handler: "handler",
      environment: tokenLambdaEnvironment
    })

    this.tokenLambda = tokenLambda

    // Define mock token lambda if `useMockOidc` is enabled
    if (props.useMockOidc) {
      if (
        !props.mockOidcjwksEndpoint ||
        !props.mockOidcUserInfoEndpoint ||
        !props.mockOidcTokenEndpoint ||
        !props.mockOidcClientId ||
        !props.mockOidcIssuer
      ) {
        throw new Error("Attempt to use mock OIDC but variables are not defined")
      }

      // Lambda environment variables for the mock token lambda
      const mockTokenLambdaEnvironment = {
        idpTokenPath: props.mockOidcTokenEndpoint,
        TokenMappingTableName: props.tokenMappingTable.tableName,
        UserPoolIdentityProvider: props.mockPoolIdentityProviderName,
        oidcjwksEndpoint: props.mockOidcjwksEndpoint,
        jwtPrivateKeyArn: sharedSecrets.mockJwtPrivateKey?.secretArn || "",
        userInfoEndpoint: props.mockOidcUserInfoEndpoint,
        useSignedJWT: "true",
        oidcClientId: props.mockOidcClientId,
        oidcIssuer: props.mockOidcIssuer
      }

      // Create the mock token lambda
      const mockTokenLambda = new NodejsFunction(this, "MockTokenLambda", {
        entry: "src/mockToken.ts",
        handler: "handler",
        environment: mockTokenLambdaEnvironment
      })

      this.mockTokenLambda = mockTokenLambda
    }

    // Define policies for the Cognito functions
    const cognitoPolicies: Array<IManagedPolicy> = [
      new ManagedPolicy(this, "TokenLambdaPolicy", {
        statements: [
          new PolicyStatement({
            actions: ["secretsmanager:GetSecretValue"],
            resources: [sharedSecrets.primaryJwtPrivateKey.secretArn]
          })
        ]
      })
    ]

    if (props.useMockOidc && sharedSecrets.mockJwtPrivateKey) {
      cognitoPolicies.push(
        new ManagedPolicy(this, "MockTokenLambdaPolicy", {
          statements: [
            new PolicyStatement({
              actions: ["secretsmanager:GetSecretValue"],
              resources: [sharedSecrets.mockJwtPrivateKey.secretArn]
            })
          ]
        })
      )
    }

    // Outputs
    this.cognitoPolicies = cognitoPolicies
  }
}
