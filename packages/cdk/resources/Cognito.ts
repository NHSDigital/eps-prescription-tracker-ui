
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
import {ICertificate} from "aws-cdk-lib/aws-certificatemanager"
import {RemovalPolicy} from "aws-cdk-lib"
import {
  AaaaRecord,
  ARecord,
  IHostedZone,
  RecordTarget
} from "aws-cdk-lib/aws-route53"
import {UserPoolDomainTarget} from "aws-cdk-lib/aws-route53-targets"

export interface CognitoProps {
  readonly primaryOidcClientId: string
  readonly primaryOidClientSecret: string
  readonly primaryOidcIssuer: string
  readonly primaryOidcAuthorizeEndpoint: string
  readonly primaryOidcUserInfoEndpoint: string
  readonly primaryOidcjwksEndpoint: string
  readonly primaryTokenEndpoint: string
  readonly useMockOidc: boolean
  readonly mockOidcClientId?: string
  readonly mockOidClientSecret?: string
  readonly mockOidcIssuer?: string
  readonly mockOidcAuthorizeEndpoint?: string
  readonly mockOidcUserInfoEndpoint?: string
  readonly mockOidcjwksEndpoint?: string
  readonly mockTokenEndpoint: string
  readonly shortCognitoDomain: string
  readonly fullCloudfrontDomain: string
  readonly fullCognitoDomain: string
  readonly cognitoCertificate: ICertificate
  readonly hostedZone: IHostedZone
}

/**
 * AWS Cognito User Pool and supporting resources
 */
export class Cognito extends Construct {
  public readonly userPool: UserPool
  public readonly userPoolClient: UserPoolClient
  public readonly userPoolDomain: UserPoolDomain
  public readonly primaryPoolIdentityProvider: UserPoolIdentityProviderOidc
  public readonly mockPoolIdentityProvider: UserPoolIdentityProviderOidc

  public constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id)

    // Resources
    const userPool = new UserPool(this, "UserPool", {
      removalPolicy: RemovalPolicy.DESTROY
    })

    const userPoolDomain = new UserPoolDomain(this, "UserPoolDomain", {
      userPool,
      customDomain: {
        domainName: props.fullCognitoDomain,
        certificate: props.cognitoCertificate
      }
    })

    new ARecord(this, "UserPoolCloudFrontAliasIpv4Record", {
      zone: props.hostedZone,
      recordName: props.shortCognitoDomain,
      target: RecordTarget.fromAlias(new UserPoolDomainTarget(userPoolDomain))
    })

    new AaaaRecord(this, "UserPoolCloudFrontAliasIpv6Record", {
      zone: props.hostedZone,
      recordName: props.shortCognitoDomain,
      target: RecordTarget.fromAlias(new UserPoolDomainTarget(userPoolDomain))
    })

    // these are the endpoints that are added to user pool identity provider
    // note we override the token endpoint to point back to our custom token
    const oidcEndpoints: OidcEndpoints = {
      authorization: props.primaryOidcAuthorizeEndpoint,
      jwksUri: props.primaryOidcjwksEndpoint,
      token: `https://${props.fullCloudfrontDomain}/api/token`,
      userInfo: props.primaryOidcUserInfoEndpoint
    }

    // eslint-disable-next-line max-len
    // see https://digital.nhs.uk/services/care-identity-service/applications-and-services/cis2-authentication/guidance-for-developers/detailed-guidance/scopes-and-claims
    // about claims that we need
    const primaryPoolIdentityProvider = new UserPoolIdentityProviderOidc(this, "UserPoolIdentityProvider", {
      name: "Primary", // this name is used in the web client
      clientId: props.primaryOidcClientId,
      clientSecret: props.primaryOidClientSecret,
      issuerUrl: props.primaryOidcIssuer,
      userPool: userPool,
      attributeRequestMethod: OidcAttributeRequestMethod.GET,
      scopes: ["openid", "profile", "email", "nhsperson", "nationalrbacaccess"],
      endpoints: oidcEndpoints
    })

    const supportedIdentityProviders: Array<UserPoolClientIdentityProvider> = [
      UserPoolClientIdentityProvider.custom(primaryPoolIdentityProvider.providerName)
    ]

    // define some variables that we need for mock authorization
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

      // these are the endpoints that are added to user pool identity provider
      // note we override the token endpoint to point back to our custom token
      const mockOidcEndpoints: OidcEndpoints = {
        authorization: props.mockOidcAuthorizeEndpoint,
        jwksUri: props.mockOidcjwksEndpoint,
        token: `https://${props.fullCloudfrontDomain}/api/mocktoken`,
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

    // add attribute mappings to what we receive back to cognito user pool attributes
    // need to use an escape hatch as can not do this with the L2 construct

    const cfnUserPoolIdentityProvider = primaryPoolIdentityProvider.node.defaultChild as CfnUserPoolIdentityProvider
    cfnUserPoolIdentityProvider.attributeMapping = {
      username: "sub",
      name: "name",
      given_name: "given_name",
      family_name: "family_name",
      email: "email"
    }

    // add the web client
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
        callbackUrls: [
          "http://localhost:3000/auth/",
          `https://${props.fullCloudfrontDomain}/site/`,
          `https://${props.fullCloudfrontDomain}/auth_demo/`
        ],
        logoutUrls: [
          "http://localhost:3000/",
          `https://${props.fullCloudfrontDomain}/site/`,
          `https://${props.fullCloudfrontDomain}/auth_demo/`
        ]
      }})

    // ensure dependencies are set correctly so items are created in the correct order
    userPoolWebClient.node.addDependency(primaryPoolIdentityProvider)
    if (props.useMockOidc) {
      userPoolWebClient.node.addDependency(mockPoolIdentityProvider)
    }

    // Outputs
    this.userPool = userPool
    this.userPoolClient = userPoolWebClient
    this.userPoolDomain = userPoolDomain
    this.primaryPoolIdentityProvider = primaryPoolIdentityProvider
    this.mockPoolIdentityProvider = mockPoolIdentityProvider!
  }
}
