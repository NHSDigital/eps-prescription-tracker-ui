
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
  public readonly mockTrackerUserInfoLambda: LambdaFunction
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

    // Secret used by lambdas that holds the JWT private key
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

    // Set up things for mock authorization
    let getMockJWTPrivateKeySecret: ManagedPolicy | undefined = undefined
    let mockJwtPrivateKey: Secret | undefined = undefined

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

      // Secret used by mock user info lambda that holds the JWT private key
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

    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //
    //           Lambda setups           //
    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //

    // CPT USER INFORMATION LAMBDA //

    // Set up things for mock authorization
    let mockTrackerUserInfoLambda: LambdaFunction
    if (props.useMockOidc) {
      // These checks are technically unnecessary, but they are here to prevent the linter from complaining
      if (
        props.mockOidcjwksEndpoint === undefined ||
        props.mockOidcUserInfoEndpoint === undefined ||
        props.mockOidcTokenEndpoint === undefined ||
        props.mockOidcClientId === undefined ||
        props.mockOidcIssuer === undefined ||
        getMockJWTPrivateKeySecret === undefined ||
        mockJwtPrivateKey === undefined
      ) {
        throw new Error("Attempt to use mock oidc but variables are not defined")
      }

      mockTrackerUserInfoLambda = new LambdaFunction(this, "MockTrackerUserInfo", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mockTrkUsrNfo`,
        additionalPolicies: [
          props.tokenMappingTableWritePolicy,
          props.tokenMappingTableReadPolicy,
          props.useTokensMappingKmsKeyPolicy,
          useJwtKmsKeyPolicy,
          getMockJWTPrivateKeySecret
        ],
        logRetentionInDays: props.logRetentionInDays,
        packageBasePath: "packages/trackerUserInfoLambda",
        entryPoint: "src/handler.ts",
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

    // Proper lambda function for user info
    const trackerUserInfoLambda = new LambdaFunction(this, "TrackerUserInfo", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-TrkUsrNfo`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKmsKeyPolicy,
        useJwtKmsKeyPolicy,
        getJWTPrivateKeySecret
      ],
      logRetentionInDays: props.logRetentionInDays,
      packageBasePath: "packages/trackerUserInfoLambda",
      entryPoint: "src/handler.ts",
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

    // PRESCRIPTION SEARCH LAMBDA //

    // const prescriptionSearchLambda = new LambdaFunction(this, "PrescriptionSearch", {
    //   runtime: Runtime.NODEJS_20_X,
    //   serviceName: props.serviceName,
    //   stackName: props.stackName,
    //   lambdaName: `${props.stackName}-prescSearch`,
    //   additionalPolicies: [
    //     props.tokenMappingTableWritePolicy,
    //     props.tokenMappingTableReadPolicy,
    //     props.useTokensMappingKmsKeyPolicy,
    //     props.sharedSecrets.useJwtKmsKeyPolicy,
    //     props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy
    //   ],
    //   logRetentionInDays: props.logRetentionInDays,
    //   packageBasePath: "packages/prescriptionSearchLambda",
    //   entryPoint: "src/handler.ts",
    //   lambdaEnvironmentVariables: {
    //     idpTokenPath: props.primaryOidcTokenEndpoint,
    //     TokenMappingTableName: props.tokenMappingTable.tableName,
    //     UserPoolIdentityProvider: props.primaryPoolIdentityProviderName,
    //     oidcjwksEndpoint: props.primaryOidcjwksEndpoint,
    //     jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
    //     userInfoEndpoint: props.primaryOidcUserInfoEndpoint,
    //     useSignedJWT: "true",
    //     oidcClientId: props.primaryOidcClientId,
    //     oidcIssuer: props.primaryOidcIssuer,
    //     apigeeApiKey: props.apigeeApiKey,
    //     jwtKid: props.jwtKid
    //   }
    // })

    // // Suppress the AwsSolutions-L1 rule for the prescription search Lambda function
    // NagSuppressions.addResourceSuppressions(prescriptionSearchLambda.lambda, [
    //   {
    //     id: "AwsSolutions-L1",
    //     reason: "The Lambda function uses the latest runtime version supported at the time of implementation."
    //   }
    // ])

    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //
    //            Permissions            //
    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //

    // Permissions for API Gateway to execute lambdas
    const apiFunctionsPolicies: Array<IManagedPolicy> = [
      trackerUserInfoLambda.executeLambdaManagedPolicy
      // prescriptionSearchLambda.executeLambdaManagedPolicy
    ]
    if (props.useMockOidc) {
      apiFunctionsPolicies.push(mockTrackerUserInfoLambda!.executeLambdaManagedPolicy)
    }

    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //
    //              Outputs              //
    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //

    // Basic outputs
    this.apiFunctionsPolicies = apiFunctionsPolicies
    this.primaryJwtPrivateKey = primaryJwtPrivateKey

    // CPT user info lambda outputs
    this.trackerUserInfoLambda = trackerUserInfoLambda
    this.mockTrackerUserInfoLambda = mockTrackerUserInfoLambda!

    // // Prescription search lambda outputs
    // this.prescriptionSearchLambda = prescriptionSearchLambda.lambda
  }
}
