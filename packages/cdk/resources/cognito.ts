
import * as cdk from "aws-cdk-lib"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as route53 from "aws-cdk-lib/aws-route53"
import * as iam from "aws-cdk-lib/aws-iam"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import * as kms from "aws-cdk-lib/aws-kms"
import {Construct} from "constructs"

import {ApiGwConstruct} from "./apiGWConstruct"
import {FunctionConstruct} from "./functionConstruct"

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

    const supportedIdentityProviders: Array<cognito.UserPoolClientIdentityProvider> = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
      cognito.UserPoolClientIdentityProvider.custom(userPoolIdentityProvider.providerName)
    ]

    const jwtKmsKey = new kms.Key(this, "JwtKMSKey", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(7),
      alias: `${props.stackName}-JwtKMSKeyKMSKey`,
      description: `${props.stackName}-JwtKMSKeyKMSKey`,
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            sid: "Enable IAM User Permissions",
            effect: iam.Effect.ALLOW,
            actions: [
              "kms:*"
            ],
            principals: [
              new iam.AccountRootPrincipal
            ],
            resources: ["*"]
          })
        ]
      })
    })

    const useJwtKmsKeyPolicy = new iam.ManagedPolicy(this, "UseJwtKmsKeyPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:DescribeKey",
            "kms:Decrypt"
          ],
          resources: [
            jwtKmsKey.keyArn
          ]
        })
      ]
    })

    // define some variables that we need for mocking
    let mockPoolIdentityProvider!: cognito.UserPoolIdentityProviderOidc
    let mockToken: FunctionConstruct

    // set up things for mock login
    if (props.useMockOidc) {
      if (props.mockOidcAuthorizeEndpoint === undefined ||
        props.mockOidcjwksEndpoint === undefined ||
        props.mockOidcUserInfoEndpoint === undefined ||
        props.mockOidcClientId === undefined ||
        props.mockOidClientSecret === undefined ||
        props.mockOidcIssuer === undefined ||
        props.mockOidcTokenEndpoint === undefined
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
        scopes: ["openid", "profile", "email"],
        endpoints: mockOidcEndpoints
      })

      supportedIdentityProviders.push(
        cognito.UserPoolClientIdentityProvider.custom(mockPoolIdentityProvider.providerName)
      )

      // lambda for mock token endpoint
      const mockJwtPrivateKey = new secretsmanager.Secret(this, "MockJwtPrivateKey", {
        secretName: `${props.stackName!}-mockJwtPrivateKey`,
        secretStringValue: cdk.SecretValue.unsafePlainText("ChangeMe"),
        encryptionKey: jwtKmsKey
      })
      const useMockJwtPrivateKey = new iam.ManagedPolicy(this, "UseMockJwtPrivateKey", {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "secretsmanager:GetSecretValue"
            ],
            resources: [
              mockJwtPrivateKey.secretArn
            ]
          })
        ]
      })
      mockToken = new FunctionConstruct(this, "MockTokenResources", {
        stackName: props.stackName!,
        lambdaName: `${props.stackName!}-mockToken`,
        additionalPolicies: [
          props.tokenMappingTableWritePolicy,
          props.tokenMappingTableReadPolicy,
          props.useTokensMappingKMSKeyPolicy,
          useJwtKmsKeyPolicy,
          useMockJwtPrivateKey
        ],
        logRetentionInDays: 30,
        packageBasePath: "packages/cognito",
        entryPoint: "src/token.ts",
        lambdaEnvironmentVariables: {
          idpTokenPath: props.mockOidcTokenEndpoint,
          TokenMappingTableName: props.tokenMappingTable.tableName,
          UserPoolIdentityProvider: userPoolIdentityProvider.providerName,
          oidcjwksEndpoint: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: mockJwtPrivateKey.secretArn
        }
      })

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

    const primaryJwtPrivateKey = new secretsmanager.Secret(this, "PrimaryJwtPrivateKey", {
      secretName: `${props.stackName!}-primaryJwtPrivateKey`,
      secretStringValue: cdk.SecretValue.unsafePlainText("ChangeMe"),
      encryptionKey: jwtKmsKey
    })
    const usePrimaryJwtPrivateKey = new iam.ManagedPolicy(this, "UsePrimaryJwtPrivateKey", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "secretsmanager:GetSecretValue"
          ],
          resources: [
            primaryJwtPrivateKey.secretArn
          ]
        })
      ]
    })
    const token = new FunctionConstruct(this, "TokenResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-token`,
      additionalPolicies: [
        props.tokenMappingTableWritePolicy,
        props.tokenMappingTableReadPolicy,
        props.useTokensMappingKMSKeyPolicy,
        useJwtKmsKeyPolicy,
        usePrimaryJwtPrivateKey
      ],
      logRetentionInDays: 30,
      packageBasePath: "packages/cognito",
      entryPoint: "src/token.ts",
      lambdaEnvironmentVariables: {
        idpTokenPath: props.primaryOidcTokenEndpoint,
        TokenMappingTableName: props.tokenMappingTable.tableName,
        UserPoolIdentityProvider: userPoolIdentityProvider.providerName,
        oidcjwksEndpoint: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: primaryJwtPrivateKey.secretArn
      }
    })

    // lambda for jwks endpoint
    const jwks = new FunctionConstruct(this, "JwksResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-jwks`,
      additionalPolicies: [ ],
      logRetentionInDays: 30,
      packageBasePath: "packages/cognito",
      entryPoint: "src/jwks.ts",
      lambdaEnvironmentVariables: { }
    })

    // permissions for api gateway to execute lambdas
    const apiGatewayAdditionalPolicies: Array<iam.IManagedPolicy> = [
      token.executeLambdaManagedPolicy,
      jwks.executeLambdaManagedPolicy
    ]
    if (props.useMockOidc) {
      apiGatewayAdditionalPolicies.push(mockToken!.executeLambdaManagedPolicy)
    }

    // api gateway to sit in front of lambdas
    const restApiGateway = new ApiGwConstruct(this, "RestApiGatewayResources", {
      additionalPolicies: apiGatewayAdditionalPolicies,
      apiName: `${props.stackName!}-apigw-cognito`,
      logRetentionInDays: 30,
      stackName: props.stackName,
      apigwName: `${props.stackName!}-apigw-cognito`

    })

    // get a TLS certificate and add it to api gateway
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

    // set up endpoints on apigateway
    new apigateway.BasePathMapping(this, "api-gw-base-path-mapping", {
      domainName: authDomainResource,
      restApi: restApiGateway.apiGw
    })

    const tokenResource = restApiGateway.apiGw.root.addResource("token")
    tokenResource.addMethod("POST", new apigateway.LambdaIntegration(token.lambda, {
      credentialsRole: restApiGateway.apiGwRole
    }))

    const jwksResource = restApiGateway.apiGw.root.addResource("jwks")
    jwksResource.addMethod("GET", new apigateway.LambdaIntegration(jwks.lambda, {
      credentialsRole: restApiGateway.apiGwRole
    }))

    // set dns record for api gateway custom domain
    new route53.CnameRecord(this, "api-gw-custom-domain-cname-record", {
      recordName: `auth.${props.stackName}`,
      zone: hostedZone,
      domainName: authDomainResource.domainNameAliasDomainName
    })

    // ensure dependencies are set correctly and mock token lambda added to api gateway if needed
    userPoolWebClient.node.addDependency(userPoolIdentityProvider)
    if (props.useMockOidc) {
      userPoolWebClient.node.addDependency(mockPoolIdentityProvider)
      const mockTokenResource = restApiGateway.apiGw.root.addResource("mockToken")
      mockTokenResource.addMethod("POST", new apigateway.LambdaIntegration(mockToken!.lambda, {
        credentialsRole: restApiGateway.apiGwRole
      }))

    }

    // Outputs
    this.userPool = userPool
    this.userPoolClient = userPoolWebClient
    this.userPoolDomain = userPoolDomain
  }
}
