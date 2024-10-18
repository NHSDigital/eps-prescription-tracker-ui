
import * as cdk from "aws-cdk-lib"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import {Construct} from "constructs"

import {CognitoFunctions} from "./cognitoFunctions"

export interface CognitoProps {
  readonly stackName: string;
  readonly primaryOidcClientId: string;
  readonly primaryOidClientSecret: string;
  readonly primaryOidcIssuer: string;
  readonly primaryOidcAuthorizeEndpoint: string;
  readonly primaryOidcTokenEndpoint: string;
  readonly primaryOidcUserInfoEndpoint: string;
  readonly primaryOidcjwksEndpoint: string;
  readonly useMockOidc: boolean
  readonly mockOidcClientId?: string;
  readonly mockOidClientSecret?: string;
  readonly mockOidcIssuer?: string;
  readonly mockOidcAuthorizeEndpoint?: string;
  readonly mockOidcTokenEndpoint?: string;
  readonly mockOidcUserInfoEndpoint?: string;
  readonly mockOidcjwksEndpoint?: string;
  readonly tokenMappingTable: dynamodb.TableV2;
  //readonly userPoolTlsCertificateArn: string;
  readonly region: string;
  readonly account: string;
  readonly tokenMappingTableWritePolicy: iam.ManagedPolicy;
  readonly tokenMappingTableReadPolicy: iam.ManagedPolicy;
  readonly useTokensMappingKMSKeyPolicy: iam.ManagedPolicy
}

/**
 * AWS Cognito User Pool
 */
export class Cognito extends Construct {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient
  public readonly userPoolDomain: cognito.UserPoolDomain

  public constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id)

    // set some constants for later use
    const environmentDomain = `${props.stackName}.${cdk.Fn.importValue("eps-route53-resources:EPS-domain")}`
    const authDomain = `auth.${environmentDomain}`
    const baseApiGwUrl = `https://${authDomain}`

    // cognito stuff
    const userPool = new cognito.UserPool(this, "UserPool", {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    const userPoolDomain = userPool.addDomain("default", {
      cognitoDomain: {
        domainPrefix: props.stackName
      }
    })

    const oidcEndpoints: cognito.OidcEndpoints = {
      authorization: props.primaryOidcAuthorizeEndpoint,
      jwksUri: props.primaryOidcjwksEndpoint,
      token: `${baseApiGwUrl}/token`,
      userInfo: props.primaryOidcUserInfoEndpoint
    }

    const primaryPoolIdentityProvider = new cognito.UserPoolIdentityProviderOidc(this, "UserPoolIdentityProvider", {
      name: "Primary",
      clientId: props.primaryOidcClientId,
      clientSecret: props.primaryOidClientSecret,
      issuerUrl: props.primaryOidcIssuer,
      userPool: userPool,
      attributeRequestMethod: cognito.OidcAttributeRequestMethod.GET,
      scopes: ["openid", "profile", "email", "nhsperson", "nationalrbacaccess"],
      endpoints: oidcEndpoints
    })

    const supportedIdentityProviders: Array<cognito.UserPoolClientIdentityProvider> = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
      cognito.UserPoolClientIdentityProvider.custom(primaryPoolIdentityProvider.providerName)
    ]

    // define some variables that we need for mocking
    let mockPoolIdentityProvider!: cognito.UserPoolIdentityProviderOidc

    // set up things for mock login
    if (props.useMockOidc) {
      if (props.mockOidcAuthorizeEndpoint === undefined ||
        props.mockOidcjwksEndpoint === undefined ||
        props.mockOidcUserInfoEndpoint === undefined ||
        props.mockOidcClientId === undefined ||
        props.mockOidClientSecret === undefined ||
        props.mockOidcIssuer === undefined
      ) {
        throw new Error("Attempt to use mock oidc but variables are not defined")
      }

      const mockOidcEndpoints: cognito.OidcEndpoints = {
        authorization: props.mockOidcAuthorizeEndpoint,
        jwksUri: props.mockOidcjwksEndpoint,
        token: `${baseApiGwUrl}/mockToken`,
        userInfo: props.mockOidcUserInfoEndpoint
      }

      mockPoolIdentityProvider = new cognito.UserPoolIdentityProviderOidc(this, "MockUserPoolIdentityProvider", {
        name: "Mock",
        clientId: props.mockOidcClientId,
        clientSecret: props.mockOidClientSecret,
        issuerUrl: props.mockOidcIssuer,
        userPool: userPool,
        attributeRequestMethod: cognito.OidcAttributeRequestMethod.GET,
        scopes: ["openid", "profile", "email", "nhsperson", "nationalrbacaccess"],
        endpoints: mockOidcEndpoints
      })

      supportedIdentityProviders.push(
        cognito.UserPoolClientIdentityProvider.custom(mockPoolIdentityProvider.providerName)
      )

    }

    // eslint-disable-next-line max-len
    const cfnUserPoolIdentityProvider = primaryPoolIdentityProvider.node.defaultChild as cognito.CfnUserPoolIdentityProvider
    cfnUserPoolIdentityProvider.attributeMapping = {
      username: "sub",
      name: "name",
      authentication_assurance_level: "authentication_assurance_level",
      acr: "acr",
      id_assurance_level: "id_assurance_level",
      amr: "amr",
      given_name: "given_name",
      family_name: "family_name",
      email: "email"
    }
    const userPoolWebClient = userPool.addClient("WebClient", {
      supportedIdentityProviders: supportedIdentityProviders,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PHONE,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN
        ],
        callbackUrls: ["http://localhost:3000/auth/"],
        logoutUrls: ["http://localhost:3000/"]
      }})

    // ensure dependencies are set correctly and mock token lambda added to api gateway if needed
    userPoolWebClient.node.addDependency(primaryPoolIdentityProvider)
    if (props.useMockOidc) {
      userPoolWebClient.node.addDependency(mockPoolIdentityProvider)
    }

    new CognitoFunctions(this, "CognitoFunctions", {
      stackName: props.stackName,
      primaryOidcTokenEndpoint: props.primaryOidcTokenEndpoint,
      primaryOidcUserInfoEndpoint: props.primaryOidcUserInfoEndpoint,
      primaryOidcjwksEndpoint: props.primaryOidcjwksEndpoint,
      primaryOidcClientId: props.primaryOidcClientId,
      primaryOidcIssuer: props.primaryOidcIssuer,
      useMockOidc: props.useMockOidc,
      mockOidcTokenEndpoint: props.mockOidcTokenEndpoint,
      mockOidcUserInfoEndpoint: props.mockOidcUserInfoEndpoint,
      mockOidcjwksEndpoint: props.mockOidcjwksEndpoint,
      mockOidcClientId: props.mockOidcClientId,
      mockOidcIssuer: props.mockOidcIssuer,
      tokenMappingTable: props.tokenMappingTable,
      tokenMappingTableWritePolicy: props.tokenMappingTableWritePolicy,
      tokenMappingTableReadPolicy: props.tokenMappingTableReadPolicy,
      useTokensMappingKMSKeyPolicy: props.useTokensMappingKMSKeyPolicy,
      primaryPoolIdentityProvider: primaryPoolIdentityProvider,
      mockPoolIdentityProvider: mockPoolIdentityProvider
    })
    // Outputs
    this.userPool = userPool
    this.userPoolClient = userPoolWebClient
    this.userPoolDomain = userPoolDomain
  }
}
