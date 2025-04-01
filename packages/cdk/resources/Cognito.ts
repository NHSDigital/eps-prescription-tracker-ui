
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
  readonly primaryOidcIssuer: string
  readonly primaryOidcAuthorizeEndpoint: string
  readonly primaryOidcUserInfoEndpoint: string
  readonly primaryOidcjwksEndpoint: string
  readonly primaryOidcTokenEndpoint: string
  readonly useMockOidc: boolean
  readonly mockOidcClientId?: string
  readonly mockOidcIssuer?: string
  readonly mockOidcAuthorizeEndpoint?: string
  readonly mockOidcUserInfoEndpoint?: string
  readonly mockOidcjwksEndpoint?: string
  readonly mockOidcTokenEndpoint: string
  readonly shortCognitoDomain: string
  readonly fullCloudfrontDomain: string
  readonly fullCognitoDomain: string
  readonly cognitoCertificate: ICertificate
  readonly hostedZone: IHostedZone
  readonly allowLocalhostAccess: boolean
  readonly useCustomCognitoDomain: boolean
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

    let userPoolDomain: UserPoolDomain
    if (props.useCustomCognitoDomain) {
      userPoolDomain = new UserPoolDomain(this, "UserPoolDomain", {
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
    } else {
      userPoolDomain = new UserPoolDomain(this, "UserPoolDomain", {
        userPool,
        cognitoDomain: {
          domainPrefix: props.shortCognitoDomain
        }
      })
    }

    // these are the endpoints that are added to user pool identity provider
    // note we override the token endpoint to point back to our custom token
    const oidcEndpoints: OidcEndpoints = {
      authorization: `https://${props.fullCloudfrontDomain}/oauth2/authorize`,
      jwksUri: props.primaryOidcjwksEndpoint,
      token: `https://${props.fullCloudfrontDomain}/oauth2/token`,
      userInfo: props.primaryOidcUserInfoEndpoint
    }

    // eslint-disable-next-line max-len
    // see https://digital.nhs.uk/services/care-identity-service/applications-and-services/cis2-authentication/guidance-for-developers/detailed-guidance/scopes-and-claims
    // about claims that we need
    const primaryPoolIdentityProvider = new UserPoolIdentityProviderOidc(this, "UserPoolIdentityProvider", {
      name: "Primary", // this name is used in the web client
      clientId: props.primaryOidcClientId,
      // secret not needed for usage but needed for cdk
      clientSecret: "dummy_value",
      issuerUrl: props.primaryOidcIssuer,
      userPool: userPool,
      attributeRequestMethod: OidcAttributeRequestMethod.GET,
      scopes: ["openid", "profile", "email", "nhsperson", "nationalrbacaccess", "associatedorgs"],
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
        props.mockOidcIssuer === undefined
      ) {
        throw new Error("Attempt to use mock oidc but variables are not defined")
      }

      // these are the endpoints that are added to user pool identity provider
      // note we override the token endpoint to point back to our custom token
      const mockOidcEndpoints: OidcEndpoints = {
        authorization: `https://${props.fullCloudfrontDomain}/oauth2/mock-authorize`,
        jwksUri: props.mockOidcjwksEndpoint,
        token: `https://${props.fullCloudfrontDomain}/oauth2/mocktoken`,
        userInfo: props.mockOidcUserInfoEndpoint
      }

      mockPoolIdentityProvider = new UserPoolIdentityProviderOidc(this, "MockUserPoolIdentityProvider", {
        name: "Mock",
        clientId: props.mockOidcClientId,
        // secret not needed for usage but needed for cdk
        clientSecret: "dummy_value",
        issuerUrl: props.mockOidcIssuer,
        userPool: userPool,
        attributeRequestMethod: OidcAttributeRequestMethod.GET,
        scopes: ["openid", "profile", "email", "nhsperson", "nationalrbacaccess", "associatedorgs"],
        endpoints: mockOidcEndpoints
      })

      supportedIdentityProviders.push(
        UserPoolClientIdentityProvider.custom(mockPoolIdentityProvider.providerName)
      )

      // Add attribute mappings to what we receive back to cognito user pool attributes
      // need to use an escape hatch as can not do this with the L2 construct
      const cfnMockUserPoolIdentityProvider = mockPoolIdentityProvider.node.defaultChild as CfnUserPoolIdentityProvider
      cfnMockUserPoolIdentityProvider.attributeMapping = {
        username: "sub",
        name: "name",
        given_name: "given_name",
        family_name: "family_name",
        email: "email"
      }
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

    const callbackUrls = [
      `https://${props.fullCloudfrontDomain}/site/select-role`,
      // TODO: This is for the proof-of-concept login page, and can probably be deleted soon.
      `https://${props.fullCloudfrontDomain}/auth_demo/`,
      `https://${props.fullCloudfrontDomain}/oauth2/callback`
    ]

    const logoutUrls = [
      `https://${props.fullCloudfrontDomain}/site/logout`,
      `https://${props.fullCloudfrontDomain}/site/logout.html`,
      `https://${props.fullCloudfrontDomain}/auth_demo/`
    ]

    if (props.allowLocalhostAccess) {
      // Local, without base path set
      callbackUrls.push("http://localhost:3000/select-role/")
      logoutUrls.push("http://localhost:3000/logout/")
      // Local, with base path set to /site
      logoutUrls.push("http://localhost:3000/site/logout/")
      callbackUrls.push("http://localhost:3000/site/select-role")
      // Auth demo stuff
      callbackUrls.push("http://localhost:3000/auth/")
      callbackUrls.push("http://localhost:3000/auth_demo/")
      // Root path, just in case
      logoutUrls.push("http://localhost:3000/")
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
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls
      }
    })

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
