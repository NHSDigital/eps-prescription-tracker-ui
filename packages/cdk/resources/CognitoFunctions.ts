
import {Construct} from "constructs"

import {LambdaFunction} from "./LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {
  AccountRootPrincipal,
  Effect,
  IManagedPolicy,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement
} from "aws-cdk-lib/aws-iam"
import {Duration, RemovalPolicy, SecretValue} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"

export interface CognitoFunctionsProps {
  readonly serviceName: string;
  readonly stackName: string;
  readonly primaryOidcTokenEndpoint: string;
  readonly primaryOidcUserInfoEndpoint: string;
  readonly primaryOidcjwksEndpoint: string;
  readonly primaryOidcClientId: string;
  readonly primaryOidcIssuer: string;
  readonly useMockOidc: boolean
  readonly mockOidcTokenEndpoint?: string;
  readonly mockOidcUserInfoEndpoint?: string;
  readonly mockOidcjwksEndpoint?: string;
  readonly mockOidcClientId?: string;
  readonly mockOidcIssuer?: string;
  readonly tokenMappingTable: ITableV2;
  readonly tokenMappingTableWritePolicy: IManagedPolicy;
  readonly tokenMappingTableReadPolicy: IManagedPolicy;
  readonly useTokensMappingKMSKeyPolicy: IManagedPolicy
  readonly primaryPoolIdentityProviderName: string
  readonly mockPoolIdentityProviderName: string
}

/**
 * AWS Cognito User Pool
 */
export class CognitoFunctions extends Construct {
  public cognitoPolicies: Array<IManagedPolicy>
  public tokenLambda: NodejsFunction
  public mockTokenLambda: NodejsFunction

  public constructor(scope: Construct, id: string, props: CognitoFunctionsProps) {
    super(scope, id)

    // set some constants for later use

    const jwtKmsKey = new Key(this, "JwtKMSKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-JwtKMSKeyKMSKey`,
      description: `${props.stackName}-JwtKMSKeyKMSKey`,
      enableKeyRotation: true,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: "Enable IAM User Permissions",
            effect: Effect.ALLOW,
            actions: [
              "kms:*"
            ],
            principals: [
              new AccountRootPrincipal
            ],
            resources: ["*"]
          })
        ]
      })
    })
    const useJwtKmsKeyPolicy = new ManagedPolicy(this, "UseJwtKmsKeyPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "kms:DescribeKey",
            "kms:Decrypt"
          ],
          resources: [
            jwtKmsKey.keyArn
          ]
        })
      ]
    })

    // define some variables that we need for mocking
    let mockTokenLambda: LambdaFunction

    // set up things for mock login
    if (props.useMockOidc) {
      if (props.mockOidcjwksEndpoint === undefined ||
        props.mockOidcUserInfoEndpoint === undefined ||
        props.mockOidcTokenEndpoint === undefined ||
        props.mockOidcClientId === undefined ||
        props.mockOidcIssuer === undefined
      ) {
        throw new Error("Attempt to use mock oidc but variables are not defined")
      }

      // lambda for mock token endpoint
      const mockJwtPrivateKey = new Secret(this, "MockJwtPrivateKey", {
        secretName: `${props.stackName!}-mockJwtPrivateKey`,
        secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
        encryptionKey: jwtKmsKey
      })
      const useMockJwtPrivateKey = new ManagedPolicy(this, "UseMockJwtPrivateKey", {
        statements: [
          new PolicyStatement({
            actions: [
              "secretsmanager:GetSecretValue"
            ],
            resources: [
              mockJwtPrivateKey.secretArn
            ]
          })
        ]
      })
      mockTokenLambda = new LambdaFunction(this, "MockTokenResources", {
        serviceName: props.serviceName,
        stackName: props.stackName!,
        lambdaName: `${props.stackName!}-mockToken`,
        additionalPolicies: [
          props.tokenMappingTableWritePolicy,
          props.tokenMappingTableReadPolicy,
          props.useTokensMappingKMSKeyPolicy,
          useJwtKmsKeyPolicy,
          useMockJwtPrivateKey
        ],
        logRetentionInDays: 30,
        packageBasePath: "packages/cognito",
        entryPoint: "src/token.ts",
        lambdaEnvironmentVariables: {
          idpTokenPath: props.mockOidcTokenEndpoint,
          TokenMappingTableName: props.tokenMappingTable.tableName,
          UserPoolIdentityProvider: props.mockPoolIdentityProviderName,
          oidcjwksEndpoint: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: mockJwtPrivateKey.secretArn,
          userInfoEndpoint: props.mockOidcUserInfoEndpoint,
          useSignedJWT: "false",
          oidcClientId: props.mockOidcClientId,
          oidcIssuer: props.mockOidcIssuer
        }
      })
    }

    // lambda for token endpoint

    const primaryJwtPrivateKey = new Secret(this, "PrimaryJwtPrivateKey", {
      secretName: `${props.stackName!}-primaryJwtPrivateKey`,
      secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
      encryptionKey: jwtKmsKey
    })
    const usePrimaryJwtPrivateKey = new ManagedPolicy(this, "UsePrimaryJwtPrivateKey", {
      statements: [
        new PolicyStatement({
          actions: [
            "secretsmanager:GetSecretValue"
          ],
          resources: [
            primaryJwtPrivateKey.secretArn
          ]
        })
      ]
    })
    const tokenLambda = new LambdaFunction(this, "TokenResources", {
      serviceName: props.serviceName,
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-token`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKMSKeyPolicy,
        useJwtKmsKeyPolicy,
        usePrimaryJwtPrivateKey
      ],
      logRetentionInDays: 30,
      packageBasePath: "packages/cognito",
      entryPoint: "src/token.ts",
      lambdaEnvironmentVariables: {
        idpTokenPath: props.primaryOidcTokenEndpoint,
        TokenMappingTableName: props.tokenMappingTable.tableName,
        UserPoolIdentityProvider: props.primaryPoolIdentityProviderName,
        oidcjwksEndpoint: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: primaryJwtPrivateKey.secretArn,
        userInfoEndpoint: props.primaryOidcUserInfoEndpoint,
        useSignedJWT: "true",
        oidcClientId: props.primaryOidcClientId,
        oidcIssuer: props.primaryOidcIssuer
      }
    })

    // permissions for api gateway to execute lambdas
    const cognitoPolicies: Array<IManagedPolicy> = [
      tokenLambda.executeLambdaManagedPolicy
    ]
    if (props.useMockOidc) {
      cognitoPolicies.push(mockTokenLambda!.executeLambdaManagedPolicy)
      this.mockTokenLambda = mockTokenLambda!.lambda
    }

    // Outputs
    this.cognitoPolicies = cognitoPolicies
    this.tokenLambda = tokenLambda.lambda

  }
}
