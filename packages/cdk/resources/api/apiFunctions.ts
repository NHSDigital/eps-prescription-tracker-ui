import {Construct} from "constructs"
import {LambdaFunction} from "../LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {
  AccountRootPrincipal,
  Effect,
  IManagedPolicy,
  IRole,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement
} from "aws-cdk-lib/aws-iam"
import {Duration, RemovalPolicy, SecretValue} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"

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
  readonly primaryPoolIdentityProviderName: string
  readonly mockPoolIdentityProviderName: string
  readonly logRetentionInDays: number
  readonly deploymentRole: IRole
}

/**
 * Class for creating functions and resources needed for API operations
 */
export class ApiFunctions extends Construct {
  public readonly apiFunctionsPolicies: Array<IManagedPolicy>
  public readonly trackerUserInfoLambda: LambdaFunction
  public readonly primaryJwtPrivateKey: Secret

  public constructor(scope: Construct, id: string, props: ApiFunctionsProps) {
    super(scope, id)

    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //
    //       Boilerplate Resources       //
    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //

    // KMS key used to encrypt the secret that stores the JWT private key
    const jwtKmsKey = new Key(this, "JwtKMSKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-JwtKMSKeyKMSKeyTrkUsrNfo`,
      description: `${props.stackName}-JwtKMSKeyKMSKeyTrkUsrNfo`,
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
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [props.deploymentRole],
            actions: [
              "kms:Encrypt",
              "kms:GenerateDataKey*"
            ],
            resources: ["*"]
          })
        ]
      })
    })
    jwtKmsKey.addAlias(`alias/${props.stackName}-jwtKmsKeyLambdas`)

    // Policy to allow decryption using the KMS key
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

    // Real JWT Secret
    const primaryJwtPrivateKey = new Secret(this, "PrimaryJwtPrivateKey", {
      secretName: `${props.stackName}-primaryJwtPrivateKeyTrkUsrNfo`,
      secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
      encryptionKey: jwtKmsKey
    })
    primaryJwtPrivateKey.addToResourcePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [props.deploymentRole],
      actions: [
        "secretsmanager:PutSecretValue"
      ],
      resources: ["*"]
    }))

    // Policy to allow access to the primary JWT private key
    const getJWTPrivateKeySecret = new ManagedPolicy(this, "getJWTPrivateKeySecret", {
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

    // Setup mock keys if needed
    let mockJwtPrivateKey: Secret | undefined = undefined
    let getMockJWTPrivateKeySecret: ManagedPolicy | undefined = undefined

    if (props.useMockOidc) {
      if (
        props.mockOidcjwksEndpoint === undefined ||
        props.mockOidcUserInfoEndpoint === undefined ||
        props.mockOidcTokenEndpoint === undefined ||
        props.mockOidcClientId === undefined ||
        props.mockOidcIssuer === undefined
      ) {
        throw new Error("Attempt to use mock oidc but variables are not defined")
      }

      mockJwtPrivateKey = new Secret(this, "MockJwtPrivateKey", {
        secretName: `${props.stackName}-mockJwtPrivateKeyTrkUsrNfo`,
        secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
        encryptionKey: jwtKmsKey
      })

      // Policy to allow access to the mock JWT private key
      getMockJWTPrivateKeySecret = new ManagedPolicy(this, "getMockJWTPrivateKeySecret", {
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
    }

    // Combine policies
    const additionalPolicies = [
      props.tokenMappingTableWritePolicy,
      props.tokenMappingTableReadPolicy,
      props.useTokensMappingKmsKeyPolicy,
      useJwtKmsKeyPolicy,
      getJWTPrivateKeySecret
    ]

    if (props.useMockOidc && getMockJWTPrivateKeySecret) {
      additionalPolicies.push(getMockJWTPrivateKeySecret)
    }

    // Environment variables
    // We pass in both sets of endpoints and keys. The Lambda code determines at runtime which to use.
    const lambdaEnv: { [key: string]: string } = {
      TokenMappingTableName: props.tokenMappingTable.tableName,

      // Real endpoints/credentials
      REAL_IDP_TOKEN_PATH: props.primaryOidcTokenEndpoint,
      REAL_USER_INFO_ENDPOINT: props.primaryOidcUserInfoEndpoint,
      REAL_OIDCJWKS_ENDPOINT: props.primaryOidcjwksEndpoint,
      REAL_JWT_PRIVATE_KEY_ARN: primaryJwtPrivateKey.secretArn,
      REAL_USER_POOL_IDP: props.primaryPoolIdentityProviderName,
      REAL_USE_SIGNED_JWT: "true",
      REAL_OIDC_CLIENT_ID: props.primaryOidcClientId,
      REAL_OIDC_ISSUER: props.primaryOidcIssuer,

      // Indicate if mock mode is available
      MOCK_MODE_ENABLED: props.useMockOidc ? "true" : "false"
    }

    // If mock OIDC is enabled, add mock environment variables
    if (props.useMockOidc && mockJwtPrivateKey) {
      lambdaEnv["MOCK_IDP_TOKEN_PATH"] = props.mockOidcTokenEndpoint!
      lambdaEnv["MOCK_USER_INFO_ENDPOINT"] = props.mockOidcUserInfoEndpoint!
      lambdaEnv["MOCK_OIDCJWKS_ENDPOINT"] = props.mockOidcjwksEndpoint!
      lambdaEnv["MOCK_JWT_PRIVATE_KEY_ARN"] = mockJwtPrivateKey.secretArn
      lambdaEnv["MOCK_USER_POOL_IDP"] = props.mockPoolIdentityProviderName
      lambdaEnv["MOCK_USE_SIGNED_JWT"] = "false"
      lambdaEnv["MOCK_OIDC_CLIENT_ID"] = props.mockOidcClientId!
      lambdaEnv["MOCK_OIDC_ISSUER"] = props.mockOidcIssuer!
    }

    // Single Lambda for both real and mock scenarios
    const trackerUserInfoLambda = new LambdaFunction(this, "TrackerUserInfo", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-TrkUsrNfoUnified`,
      additionalPolicies: additionalPolicies,
      logRetentionInDays: props.logRetentionInDays,
      packageBasePath: "packages/trackerUserInfoLambda",
      entryPoint: "src/handler.ts",
      lambdaEnvironmentVariables: lambdaEnv
    })

    // This one Lambda can handle both mock and real requests at runtime

    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //
    //            Permissions            //
    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //

    // Permissions for API Gateway to execute lambdas
    const apiFunctionsPolicies: Array<IManagedPolicy> = [
      trackerUserInfoLambda.executeLambdaManagedPolicy
      // prescriptionSearchLambda.executeLambdaManagedPolicy
    ]

    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //
    //              Outputs              //
    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //

    // Basic outputs
    this.apiFunctionsPolicies = apiFunctionsPolicies
    this.primaryJwtPrivateKey = primaryJwtPrivateKey

    // CPT user info lambda outputs
    this.trackerUserInfoLambda = trackerUserInfoLambda
  }
}
