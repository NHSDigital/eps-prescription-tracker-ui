import {Construct} from "constructs"
import {LambdaFunction} from "../LambdaFunction"
import {ITableV2} from "aws-cdk-lib/aws-dynamodb"
import {IManagedPolicy} from "aws-cdk-lib/aws-iam"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"

export interface OAuth2FunctionsProps {
  readonly serviceName: string
  readonly stackName: string
  readonly fullCloudfrontDomain: string
  readonly fullCognitoDomain: string
  readonly userPoolClientId: string
  readonly primaryOidcIssuer: string
  readonly primaryOidcAuthorizeEndpoint: string
  readonly primaryOidcClientId: string
  readonly useMockOidc: boolean
  readonly mockOidcIssuer?: string
  readonly mockOidcAuthorizeEndpoint?: string
  readonly mockOidcClientId?: string
  readonly stateMappingTable: ITableV2
  readonly stateMappingTableWritePolicy: IManagedPolicy
  readonly stateMappingTableReadPolicy: IManagedPolicy
  readonly useStateMappingKmsKeyPolicy: IManagedPolicy
  readonly logRetentionInDays: number
  readonly logLevel: string
  readonly jwtKid: string
}

/**
 * Functions and resources that are needed for OAuth2
 */
export class OAuth2Functions extends Construct {
  public readonly oAuth2Policies: Array<IManagedPolicy>
  public readonly authorizeLambda: NodejsFunction
  public readonly mockAuthorizeLambda: NodejsFunction
  public readonly idpResponseLambda: NodejsFunction
  public readonly pingResponseLambda: NodejsFunction

  public constructor(scope: Construct, id: string, props: OAuth2FunctionsProps) {
    super(scope, id)

    let useMock
    let mockOidcAuthorizeEndpoint
    let mockOidcIssuer
    let mockOidcClientId
    if (props.useMockOidc) {
      useMock = "true"
      mockOidcIssuer = props.mockOidcIssuer as string
      mockOidcAuthorizeEndpoint = props.mockOidcAuthorizeEndpoint as string
      mockOidcClientId = props.mockOidcClientId as string
    } else {
      useMock = "false"
      mockOidcAuthorizeEndpoint = ""
      mockOidcIssuer = ""
      mockOidcClientId = ""
    }

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
        useMock,
        IDP_AUTHORIZE_PATH: props.primaryOidcAuthorizeEndpoint,
        OIDC_CLIENT_ID: props.primaryOidcClientId,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
        StateMappingTableName: props.stateMappingTable.tableName
      }
    })

    // This proxy handles the return journey from the IdP login initiated by the authorize lambda
    const idpResponseLambda = new LambdaFunction(this, "IDPResponseLambdaResources", {
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
        COGNITO_DOMAIN: props.fullCognitoDomain,
        MOCK_OIDC_ISSUER: mockOidcIssuer,
        PRIMARY_OIDC_ISSUER: props.primaryOidcIssuer
      }
    })

    // Healthcheck endpoint
    const pingResponseLambda = new LambdaFunction(this, "OAuth2PingLambdaResources", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: `${props.stackName}-ping`,
      additionalPolicies: [],
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      packageBasePath: "packages/pingLambda",
      entryPoint: "src/handler.ts",
      lambdaEnvironmentVariables: {}
    })

    // Initialize policies
    const oauth2Policies: Array<IManagedPolicy> = [
      authorizeLambda.executeLambdaManagedPolicy,
      idpResponseLambda.executeLambdaManagedPolicy,
      pingResponseLambda.executeLambdaManagedPolicy
    ]

    let mockAuthorizeLambda: LambdaFunction
    if (props.useMockOidc) {
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
          useMock,
          IDP_AUTHORIZE_PATH: mockOidcAuthorizeEndpoint,
          OIDC_CLIENT_ID: mockOidcClientId,
          COGNITO_CLIENT_ID: props.userPoolClientId,
          FULL_CLOUDFRONT_DOMAIN: props.fullCloudfrontDomain,
          StateMappingTableName: props.stateMappingTable.tableName
        }
      })

      oauth2Policies.push(
        mockAuthorizeLambda.executeLambdaManagedPolicy
      )

      // Output
      this.mockAuthorizeLambda = mockAuthorizeLambda.lambda
    }

    // Outputs
    this.oAuth2Policies = oauth2Policies
    this.authorizeLambda = authorizeLambda.lambda
    this.idpResponseLambda = idpResponseLambda.lambda
    this.pingResponseLambda = pingResponseLambda.lambda
  }
}
