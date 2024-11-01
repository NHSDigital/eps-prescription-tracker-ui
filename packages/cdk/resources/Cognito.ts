
import {Construct} from "constructs"

import {
  CfnUserPoolIdentityProvider,
  OAuthScope,
  OidcAttributeRequestMethod,
  OidcEndpoints,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolDomain,
  UserPoolIdentityProviderOidc
} from "aws-cdk-lib/aws-cognito"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"
import {RemovalPolicy} from "aws-cdk-lib"

export interface CognitoProps {
  readonly primaryOidcClientId: string;
  readonly primaryOidClientSecret: string;
  readonly primaryOidcIssuer: string;
  readonly primaryOidcAuthorizeEndpoint: string;
  readonly primaryOidcUserInfoEndpoint: string;
  readonly primaryOidcjwksEndpoint: string;
  readonly primaryTokenEndpoint: string;
  readonly useMockOidc: boolean
  readonly mockOidcClientId?: string;
  readonly mockOidClientSecret?: string;
  readonly mockOidcIssuer?: string;
  readonly mockOidcAuthorizeEndpoint?: string;
  readonly mockOidcUserInfoEndpoint?: string;
  readonly mockOidcjwksEndpoint?: string;
  readonly mockTokenEndpoint: string;
  readonly cognitoDomain: string
  readonly cognitoCertificate: Certificate
}

/**
 * AWS Cognito User Pool
 */
export class Cognito extends Construct {
  public readonly userPool: UserPool
  public readonly userPoolClient: UserPoolClient
  public readonly userPoolDomain: UserPoolDomain

  public constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id)

    // Imports

    // set some constants for later use
    //const baseApiGwUrl = `https://${props.cognitoDomain}`

    // cognito stuff
    const userPool = new UserPool(this, "UserPool", {
      removalPolicy: RemovalPolicy.DESTROY
    })

    const userPoolDomain = new UserPoolDomain(this, "UserPoolDomain", {
      userPool,
      customDomain: {
        domainName: props.cognitoDomain,
        certificate: props.cognitoCertificate
      }
    })

    /*
    new ARecord(this, "UserPoolCloudFrontAliasRecord", {
      zone: hostedZone,
      recordName: props.cognitoDomain,
      target: RecordTarget.fromAlias(new UserPoolDomainTarget(userPoolDomain))
    })
    */

    const oidcEndpoints: OidcEndpoints = {
      authorization: props.primaryOidcAuthorizeEndpoint,
      jwksUri: props.primaryOidcjwksEndpoint,
      //      token: `https://${props.cloudfrontDomain}/api/token`,
      token: props.primaryTokenEndpoint,
      userInfo: props.primaryOidcUserInfoEndpoint
    }

    const primaryPoolIdentityProvider = new UserPoolIdentityProviderOidc(this, "UserPoolIdentityProvider", {
      name: "Primary",
      clientId: props.primaryOidcClientId,
      clientSecret: props.primaryOidClientSecret,
      issuerUrl: props.primaryOidcIssuer,
      userPool: userPool,
      attributeRequestMethod: OidcAttributeRequestMethod.GET,
      scopes: ["openid", "profile", "email", "nhsperson", "nationalrbacaccess"],
      endpoints: oidcEndpoints
    })

    const supportedIdentityProviders: Array<UserPoolClientIdentityProvider> = [
      UserPoolClientIdentityProvider.COGNITO,
      UserPoolClientIdentityProvider.custom(primaryPoolIdentityProvider.providerName)
    ]

    // define some variables that we need for mocking
    let mockPoolIdentityProvider!: UserPoolIdentityProviderOidc

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

      const mockOidcEndpoints: OidcEndpoints = {
        authorization: props.mockOidcAuthorizeEndpoint,
        jwksUri: props.mockOidcjwksEndpoint,
        //      token: `https://${props.cloudfrontDomain}/api/token`,
        token: props.mockTokenEndpoint,
        userInfo: props.mockOidcUserInfoEndpoint
      }

      mockPoolIdentityProvider = new UserPoolIdentityProviderOidc(this, "MockUserPoolIdentityProvider", {
        name: "Mock",
        clientId: props.mockOidcClientId,
        clientSecret: props.mockOidClientSecret,
        issuerUrl: props.mockOidcIssuer,
        userPool: userPool,
        attributeRequestMethod: OidcAttributeRequestMethod.GET,
        scopes: ["openid", "profile", "email", "nhsperson", "nationalrbacaccess"],
        endpoints: mockOidcEndpoints
      })

      supportedIdentityProviders.push(
        UserPoolClientIdentityProvider.custom(mockPoolIdentityProvider.providerName)
      )

    }

    // need to use an escape hatch as can not do this with L2 construct

    const cfnUserPoolIdentityProvider = primaryPoolIdentityProvider.node.defaultChild as CfnUserPoolIdentityProvider
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
          OAuthScope.OPENID,
          OAuthScope.EMAIL,
          OAuthScope.PHONE,
          OAuthScope.PROFILE,
          OAuthScope.COGNITO_ADMIN
        ],
        callbackUrls: ["http://localhost:3000/auth/"],
        logoutUrls: ["http://localhost:3000/"]
      }})

    // ensure dependencies are set correctly and mock token lambda added to api gateway if needed
    userPoolWebClient.node.addDependency(primaryPoolIdentityProvider)
    if (props.useMockOidc) {
      userPoolWebClient.node.addDependency(mockPoolIdentityProvider)
    }

    // Outputs
    this.userPool = userPool
    this.userPoolClient = userPoolWebClient
    this.userPoolDomain = userPoolDomain
  }
}
