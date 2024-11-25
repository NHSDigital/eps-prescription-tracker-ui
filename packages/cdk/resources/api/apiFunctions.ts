import {Construct} from "constructs"
import {LambdaFunction} from "../LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {SharedSecrets} from "../SharedSecrets"

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
}

/**
 * Class for creating functions and resources needed for API operations
 */
export class ApiFunctions extends Construct {
  public readonly apiFunctionsPolicies: Array<IManagedPolicy>
  public readonly prescriptionSearchLambda: NodejsFunction
  public readonly mockPrescriptionSearchLambda: NodejsFunction

  public constructor(scope: Construct, id: string, props: ApiFunctionsProps) {
    super(scope, id)

    // Prescription Search Lambda Function
    const prescriptionSearchLambda = new LambdaFunction(this, "PrescriptionSearch", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-prescSearch`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKmsKeyPolicy,
        props.sharedSecrets.useJwtKmsKeyPolicy
      ],
      logRetentionInDays: props.logRetentionInDays,
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
        oidcIssuer: props.primaryOidcIssuer
      }
    })

    // Initialize policies for API functions
    const apiFunctionsPolicies: Array<IManagedPolicy> = [prescriptionSearchLambda.executeLambdaManagedPolicy]

    // If mock OIDC is enabled, configure mock prescription search Lambda
    let mockPrescriptionSearchLambda: LambdaFunction | undefined
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

      mockPrescriptionSearchLambda = new LambdaFunction(this, "MockPrescriptionSearch", {
        serviceName: props.serviceName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-mockPrescSearch`,
        additionalPolicies: [
          props.tokenMappingTableWritePolicy,
          props.tokenMappingTableReadPolicy,
          props.useTokensMappingKmsKeyPolicy,
          props.sharedSecrets.useJwtKmsKeyPolicy
        ],
        logRetentionInDays: props.logRetentionInDays,
        packageBasePath: "packages/prescriptionSearchLambda",
        entryPoint: "src/handler.ts",
        lambdaEnvironmentVariables: {
          idpTokenPath: props.mockOidcTokenEndpoint,
          TokenMappingTableName: props.tokenMappingTable.tableName,
          UserPoolIdentityProvider: props.mockPoolIdentityProviderName,
          oidcjwksEndpoint: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: props.sharedSecrets.mockJwtPrivateKey.secretArn,
          userInfoEndpoint: props.mockOidcUserInfoEndpoint,
          useSignedJWT: "true",
          oidcClientId: props.mockOidcClientId,
          oidcIssuer: props.mockOidcIssuer
        }
      })

      apiFunctionsPolicies.push(mockPrescriptionSearchLambda.executeLambdaManagedPolicy)
      this.mockPrescriptionSearchLambda = mockPrescriptionSearchLambda.lambda
    }

    // Outputs
    this.apiFunctionsPolicies = apiFunctionsPolicies
    this.prescriptionSearchLambda = prescriptionSearchLambda.lambda
  }
}
