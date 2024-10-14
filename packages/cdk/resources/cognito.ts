
import * as cdk from "aws-cdk-lib"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as route53 from "aws-cdk-lib/aws-route53"
import * as iam from "aws-cdk-lib/aws-iam"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import {Construct} from "constructs"

import {ApiGwConstruct} from "./apiGWConstruct"
import {LambdaConstruct} from "./lambdaConstruct"

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
  readonly userPoolTlsCertificateArn: string;
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

    // create a variable of type hosted zone pointing to our hosted zone
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "hosted-zone", {
      hostedZoneId: cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID"),
      zoneName: cdk.Fn.importValue("eps-route53-resources:EPS-domain")
    })

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

    const userPoolIdentityProvider = new cognito.UserPoolIdentityProviderOidc(this, "UserPoolIdentityProvider", {
      name: "Primary",
      clientId: props.primaryOidcClientId,
      clientSecret: props.primaryOidClientSecret,
      issuerUrl: props.primaryOidcIssuer,
      userPool: userPool,
      attributeRequestMethod: cognito.OidcAttributeRequestMethod.GET,
      scopes: ["openid", "profile", "email"],
      endpoints: oidcEndpoints
    })

    const supportedIdentityProviders = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
      cognito.UserPoolClientIdentityProvider.custom(userPoolIdentityProvider.providerName)
    ]

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
        token: `${baseApiGwUrl}/token`,
        userInfo: props.mockOidcUserInfoEndpoint
      }
      const mockPoolIdentityProvider = new cognito.UserPoolIdentityProviderOidc(this, "MockUserPoolIdentityProvider", {
        name: "Primary",
        clientId: props.mockOidcClientId,
        clientSecret: props.mockOidClientSecret,
        issuerUrl: props.mockOidcIssuer,
        userPool: userPool,
        attributeRequestMethod: cognito.OidcAttributeRequestMethod.GET,
        scopes: ["openid", "profile", "email"],
        endpoints: mockOidcEndpoints
      })

      supportedIdentityProviders.push(
        cognito.UserPoolClientIdentityProvider.custom(mockPoolIdentityProvider.providerName)
      )
    }

    // eslint-disable-next-line max-len
    const cfnUserPoolIdentityProvider = userPoolIdentityProvider.node.defaultChild as cognito.CfnUserPoolIdentityProvider
    cfnUserPoolIdentityProvider.attributeMapping = {
      username: "sub",
      email: "email",
      "email_verified": "email_verified",
      "phone_number": "phone_number",
      "phone_number_verified": "phone_number_verified",
      profile: "profile"
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

    // lambda for token endpoint
    const token = new LambdaConstruct(this, "TokenResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-token`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKMSKeyPolicy
      ],
      logRetentionInDays: 30,
      packageBasePath: "packages/cognito",
      entryPoint: "src/token.ts",
      lambdaEnvironmentVariables: {
        "idp_token_path": props.primaryOidcTokenEndpoint,
        TokenMappingTableName: props.tokenMappingTable.tableName,
        UserPoolIdentityProvider: userPoolIdentityProvider.providerName,
        "jwks_uri": props.primaryOidcjwksEndpoint!
      }
    })

    const jwks = new LambdaConstruct(this, "JwksResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-jwks`,
      additionalPolicies: [ ],
      logRetentionInDays: 30,
      packageBasePath: "packages/cognito",
      entryPoint: "src/jwks.ts",
      lambdaEnvironmentVariables: { }
    })

    // api gateway to sit in front of lambda
    const restApiGateway = new ApiGwConstruct(this, "RestApiGatewayResources", {
      additionalPolicies: [
        token.executeLambdaManagedPolicy
      ],
      apiName: `${props.stackName!}-apigw-cognito`,
      logRetentionInDays: 30,
      stackName: props.stackName,
      apigwName: `${props.stackName!}-apigw-cognito`

    })

    const authCertificate = new certificatemanager.Certificate(this, "certificate", {
      domainName: authDomain,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone)
    })

    const authDomainResource = new apigateway.DomainName(this, "authApiDomain", {
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      domainName: authDomain,
      certificate: authCertificate,
      endpointType: apigateway.EndpointType.REGIONAL
    })

    new apigateway.BasePathMapping(this, "api-gw-base-path-mapping", {
      domainName: authDomainResource,
      restApi: restApiGateway.apiGw
    })

    const tokenResource = restApiGateway.apiGw.root.addResource("token")
    tokenResource.addMethod("POST", new apigateway.LambdaIntegration(token.lambda, {
      credentialsRole: restApiGateway.apiGwRole
    }))

    const jwksResource = restApiGateway.apiGw.root.addResource("jwks")
    jwksResource.addMethod("POST", new apigateway.LambdaIntegration(jwks.lambda, {
      credentialsRole: restApiGateway.apiGwRole
    }))

    new route53.CnameRecord(this, "api-gw-custom-domain-cname-record", {
      recordName: `auth.${props.stackName}`,
      zone: hostedZone,
      domainName: authDomainResource.domainNameAliasDomainName
    })

    // Outputs
    this.userPool = userPool
    this.userPoolClient = userPoolWebClient
    this.userPoolDomain = userPoolDomain
  }
}
