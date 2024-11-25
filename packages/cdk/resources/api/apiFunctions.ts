import {Construct} from "constructs"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy, ManagedPolicy, PolicyStatement} from "aws-cdk-lib/aws-iam"
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

export class ApiFunctions extends Construct {
  public readonly apiFunctionsPolicies: Array<IManagedPolicy>
  public readonly prescriptionSearchLambda: NodejsFunction
  public readonly mockPrescriptionSearchLambda?: NodejsFunction

  public constructor(scope: Construct, id: string, props: ApiFunctionsProps) {
    super(scope, id)

    const {sharedSecrets} = props

    // Environment variables for the prescription search lambda
    const prescriptionSearchEnvironment = {
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

    // Create the prescription search lambda
    const prescriptionSearchLambda = new NodejsFunction(this, "PrescriptionSearchLambda", {
      entry: "src/prescriptionSearch.ts",
      handler: "handler",
      environment: prescriptionSearchEnvironment
    })

    this.prescriptionSearchLambda = prescriptionSearchLambda

    // Handle mock prescription search lambda if `useMockOidc` is enabled
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

      // Environment variables for the mock prescription search lambda
      const mockPrescriptionSearchEnvironment = {
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

      // Create the mock prescription search lambda
      const mockPrescriptionSearchLambda = new NodejsFunction(this, "MockPrescriptionSearchLambda", {
        entry: "src/mockPrescriptionSearch.ts",
        handler: "handler",
        environment: mockPrescriptionSearchEnvironment
      })

      this.mockPrescriptionSearchLambda = mockPrescriptionSearchLambda
    }

    // Define policies for the API functions
    const apiFunctionsPolicies: Array<IManagedPolicy> = [
      new ManagedPolicy(this, "PrescriptionSearchPolicy", {
        statements: [
          new PolicyStatement({
            actions: ["secretsmanager:GetSecretValue"],
            resources: [sharedSecrets.primaryJwtPrivateKey.secretArn]
          })
        ]
      })
    ]

    if (props.useMockOidc && sharedSecrets.mockJwtPrivateKey) {
      apiFunctionsPolicies.push(
        new ManagedPolicy(this, "MockPrescriptionSearchPolicy", {
          statements: [
            new PolicyStatement({
              actions: ["secretsmanager:GetSecretValue"],
              resources: [sharedSecrets.mockJwtPrivateKey.secretArn]
            })
          ]
        })
      )
    }

    this.apiFunctionsPolicies = apiFunctionsPolicies
  }
}
