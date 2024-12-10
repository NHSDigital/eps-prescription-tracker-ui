import {Construct} from "constructs"

import {LambdaFunction} from "../LambdaFunction"
import {SharedSecrets} from "../SharedSecrets"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {Runtime} from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {NagSuppressions} from "cdk-nag"

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
  readonly sharedSecrets: SharedSecrets
  readonly apigeeTokenEndpoint: string
  readonly apigeePrescriptionsEndpoint: string
  readonly apigeeApiKey: string
  readonly jwtKid: string
  readonly logLevel: string
  readonly roleId: string
}

/**
 * Class for creating functions and resources needed for API operations
 */
export class ApiFunctions extends Construct {
  public readonly apiFunctionsPolicies: Array<IManagedPolicy>
  public readonly prescriptionSearchLambda: NodejsFunction
  public readonly mockPrescriptionSearchLambda: NodejsFunction
  public readonly trackerUserInfoLambda: NodejsFunction
  public readonly mockTrackerUserInfoLambda: NodejsFunction
  public readonly primaryJwtPrivateKey: Secret

  public constructor(scope: Construct, id: string, props: ApiFunctionsProps) {
    super(scope, id)

    // Permissions for API Gateway to execute lambdas
    const apiFunctionsPolicies: Array<IManagedPolicy> = []

    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //
    //           Lambda setups           //
    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //

    // CPT USER INFORMATION LAMBDA //

    // Set up things for mock authorization
    let mockTrackerUserInfoLambda: LambdaFunction | undefined
    if (props.useMockOidc) {
      if (
        props.mockOidcjwksEndpoint === undefined ||
        props.mockOidcUserInfoEndpoint === undefined ||
        props.mockOidcTokenEndpoint === undefined ||
        props.mockOidcClientId === undefined ||
        props.mockOidcIssuer === undefined ||
        props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy === undefined ||
        props.sharedSecrets.mockJwtPrivateKey.secretArn === undefined
      ) {
        throw new Error("Attempt to use mock oidc but variables are not defined")
      }

      // Create the LambdaFunction
      mockTrackerUserInfoLambda = new LambdaFunction(this, "MockTrackerUserInfo", {
        runtime: Runtime.NODEJS_20_X,
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mockTrkUsrNfo`,
        additionalPolicies: [
          props.tokenMappingTableWritePolicy,
          props.tokenMappingTableReadPolicy,
          props.useTokensMappingKmsKeyPolicy,
          props.sharedSecrets.useJwtKmsKeyPolicy,
          props.sharedSecrets.getMockJwtPrivateKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        logLevel: props.logLevel,
        packageBasePath: "packages/trackerUserInfoLambda",
        entryPoint: "src/handler.ts",
        lambdaEnvironmentVariables: {
          idpTokenPath: props.mockOidcTokenEndpoint,
          TokenMappingTableName: props.tokenMappingTable.tableName,
          UserPoolIdentityProvider: props.mockPoolIdentityProviderName,
          oidcjwksEndpoint: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: props.sharedSecrets.mockJwtPrivateKey.secretArn,
          userInfoEndpoint: props.mockOidcUserInfoEndpoint,
          useSignedJWT: "false",
          oidcClientId: props.mockOidcClientId,
          oidcIssuer: props.mockOidcIssuer
        }
      })

      // Add the policy to apiFunctionsPolicies
      apiFunctionsPolicies.push(mockTrackerUserInfoLambda.executeLambdaManagedPolicy)
    }

    // Proper lambda function for user info
    const trackerUserInfoLambda = new LambdaFunction(this, "TrackerUserInfo", {
      runtime: Runtime.NODEJS_20_X,
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-TrkUsrNfo`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKmsKeyPolicy,
        props.sharedSecrets.useJwtKmsKeyPolicy,
        props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/trackerUserInfoLambda",
      entryPoint: "src/handler.ts",
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

    apiFunctionsPolicies.push(trackerUserInfoLambda.executeLambdaManagedPolicy)

    // Prescription Search Lambda Function
    const prescriptionSearchLambda = new LambdaFunction(this, "PrescriptionSearch", {
      runtime: Runtime.NODEJS_20_X,
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-prescSearch`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKmsKeyPolicy,
        props.sharedSecrets.useJwtKmsKeyPolicy,
        props.sharedSecrets.getPrimaryJwtPrivateKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/prescriptionSearchLambda",
      entryPoint: "src/handler.ts",
      lambdaEnvironmentVariables: {
        idpTokenPath: props.primaryOidcTokenEndpoint,
        TokenMappingTableName: props.tokenMappingTable.tableName,
        UserPoolIdentityProvider: props.primaryPoolIdentityProviderName,
        oidcjwksEndpoint: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: props.sharedSecrets.primaryJwtPrivateKey.secretArn,
        userInfoEndpoint: props.primaryOidcUserInfoEndpoint,
        useSignedJWT: "true",
        oidcClientId: props.primaryOidcClientId,
        oidcIssuer: props.primaryOidcIssuer,
        apigeeTokenEndpoint: props.apigeeTokenEndpoint,
        apigeePrescriptionsEndpoint: props.apigeePrescriptionsEndpoint,
        apigeeApiKey: props.apigeeApiKey,
        jwtKid: props.jwtKid,
        roleId: props.roleId
      }
    })

    apiFunctionsPolicies.push(prescriptionSearchLambda.executeLambdaManagedPolicy)

    // Suppress the AwsSolutions-L1 rule for the prescription search Lambda function
    NagSuppressions.addResourceSuppressions(prescriptionSearchLambda.lambda, [
      {
        id: "AwsSolutions-L1",
        reason: "The Lambda function uses the latest runtime version supported at the time of implementation."
      }
    ])

    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //
    //              Outputs              //
    // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* //

    // Basic outputs
    this.apiFunctionsPolicies = apiFunctionsPolicies
    this.primaryJwtPrivateKey = props.sharedSecrets.primaryJwtPrivateKey

    // CPT user info lambda outputs
    this.trackerUserInfoLambda = trackerUserInfoLambda.lambda
    // this.mockTrackerUserInfoLambda = mockTrackerUserInfoLambda.lambda

    // Prescription search lambda outputs
    this.prescriptionSearchLambda = prescriptionSearchLambda.lambda
  }
}
