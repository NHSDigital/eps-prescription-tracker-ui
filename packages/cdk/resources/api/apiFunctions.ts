import {Construct} from "constructs"
import {LambdaFunction} from "../LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {Runtime} from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {SharedSecrets} from "../SharedSecrets"
import {NagSuppressions} from "cdk-nag"

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

  public constructor(scope: Construct, id: string, props: ApiFunctionsProps) {
    super(scope, id)

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

    // Suppress the AwsSolutions-L1 rule for the prescription search Lambda function
    NagSuppressions.addResourceSuppressions(prescriptionSearchLambda.lambda, [
      {
        id: "AwsSolutions-L1",
        reason: "The Lambda function uses the latest runtime version supported at the time of implementation."
      }
    ])

    // Initialize policies for API functions
    const apiFunctionsPolicies: Array<IManagedPolicy> = [prescriptionSearchLambda.executeLambdaManagedPolicy]

    // Outputs
    this.apiFunctionsPolicies = apiFunctionsPolicies
    this.prescriptionSearchLambda = prescriptionSearchLambda.lambda
  }
}
