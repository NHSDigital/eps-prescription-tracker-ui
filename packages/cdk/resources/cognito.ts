
import * as cdk from "aws-cdk-lib"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as route53 from "aws-cdk-lib/aws-route53"
import * as iam from "aws-cdk-lib/aws-iam"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"

import {ApiGwConstruct} from "./apiGWConstruct"
import {LambdaConstruct} from "./lambdaConstruct"
import {Construct} from "constructs"
import {NagSuppressions} from "cdk-nag"

export interface CognitoProps {
  readonly stackName: string;
  readonly primaryOidcClientId: string;
  readonly primaryOidClientSecret: string;
  readonly primaryOidcIssuer: string;
  readonly primaryOidcAuthorizeEndpoint: string;
  readonly primaryOidcTokenEndpoint: string;
  readonly primaryOidcUserInfoEndpoint: string;
  readonly primaryOidcjwksEndpoint: string;
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
    const hostedZone = route53.HostedZone.fromHostedZoneId(
      this,
      "Zone",
      cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID")
    )

    // cognito stuff
    const userPool = new cognito.UserPool(this, "UserPool", {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    NagSuppressions.addResourceSuppressions(userPool, [
      {
        id: "AwsSolutions-COG1",
        reason: "Suppress error for password policy as we don't use passwords"
      },
      {
        id: "AwsSolutions-COG2",
        reason: "Suppress warning for MFA policy as we don't use passwords"
      },
      {
        id: "AwsSolutions-COG3",
        reason: "Suppress error for advanced security features"
      }
    ])
    const userPoolDomain = userPool.addDomain("default", {
      cognitoDomain: {
        domainPrefix: "eps-dev"
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
      attributeMapping: {
        email: cognito.ProviderAttribute.other("sub")
      },
      scopes: ["openid", "profile", "email"],
      endpoints: oidcEndpoints
    })

    const userPoolWebClient = userPool.addClient("WebClient", {
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.custom(userPoolIdentityProvider.providerName)
      ],
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

    const authCertificate = new certificatemanager.Certificate(
      this,
      "certificate",
      {
        domainName: authDomain,
        validation: certificatemanager.CertificateValidation.fromDns(hostedZone)
      }
    )

    restApiGateway.apiGw.addDomainName("RestApiDomain", {
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      domainName: authDomain,
      certificate: authCertificate,
      endpointType: apigateway.EndpointType.REGIONAL
    })

    const tokenResource = restApiGateway.apiGw.root.addResource("token")
    const tokenMethodResource = tokenResource.addMethod("POST", new apigateway.LambdaIntegration(token.lambda))

    NagSuppressions.addResourceSuppressions(tokenMethodResource, [
      {
        id: "AwsSolutions-APIG4",
        reason: "Suppress error for not implementing authorization as we don't need it"
      },
      {
        id: "AwsSolutions-COG4",
        reason: "Suppress error for not implementing cognito authorization as we don't need it"
      }
    ])
    const dnsName = restApiGateway.apiGw.domainName
    if(!dnsName) {
      throw new Error("can not get domain")
    }
    new route53.CfnRecordSet(this, "RestApiRecordSet", {
      name: authDomain,
      type: "A",
      hostedZoneId: cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID"),
      aliasTarget: {
        dnsName: dnsName.domainName,
        hostedZoneId: dnsName.domainNameAliasHostedZoneId
      }
    })

    // Outputs
    this.userPool = userPool
    this.userPoolClient = userPoolWebClient
    this.userPoolDomain = userPoolDomain
  }
}
