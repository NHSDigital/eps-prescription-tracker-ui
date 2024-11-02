
import {Construct} from "constructs"

import {ApiGwConstruct} from "./apiGWConstruct"
import {LambdaFunction} from "./LambdaFunction"
import {TableV2} from "aws-cdk-lib/aws-dynamodb"
import {
  AccountRootPrincipal,
  Effect,
  IManagedPolicy,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement
} from "aws-cdk-lib/aws-iam"
import {UserPoolIdentityProviderOidc} from "aws-cdk-lib/aws-cognito"
import {
  Duration,
  Fn,
  RemovalPolicy,
  SecretValue
} from "aws-cdk-lib"
import {CnameRecord, HostedZone} from "aws-cdk-lib/aws-route53"
import {Key} from "aws-cdk-lib/aws-kms"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"
import {
  BasePathMapping,
  DomainName,
  EndpointType,
  LambdaIntegration,
  SecurityPolicy
} from "aws-cdk-lib/aws-apigateway"

export interface CognitoFunctionsProps {
  readonly serviceName: string;
  readonly stackName: string;
  readonly primaryOidcTokenEndpoint: string;
  readonly primaryOidcUserInfoEndpoint: string;
  readonly primaryOidcjwksEndpoint: string;
  readonly primaryOidcClientId: string;
  readonly primaryOidcIssuer: string;
  readonly useMockOidc: boolean
  readonly mockOidcTokenEndpoint?: string;
  readonly mockOidcUserInfoEndpoint?: string;
  readonly mockOidcjwksEndpoint?: string;
  readonly mockOidcClientId?: string;
  readonly mockOidcIssuer?: string;
  readonly tokenMappingTable: TableV2;
  readonly tokenMappingTableWritePolicy: ManagedPolicy;
  readonly tokenMappingTableReadPolicy: ManagedPolicy;
  readonly useTokensMappingKMSKeyPolicy: ManagedPolicy
  readonly primaryPoolIdentityProvider: UserPoolIdentityProviderOidc
  readonly mockPoolIdentityProvider: UserPoolIdentityProviderOidc
}

/**
 * AWS Cognito User Pool
 */
export class CognitoFunctions extends Construct {
  public constructor(scope: Construct, id: string, props: CognitoFunctionsProps) {
    super(scope, id)

    // set some constants for later use
    const environmentDomain = `${props.stackName}.${Fn.importValue("eps-route53-resources:EPS-domain")}`
    const authDomain = `auth.${environmentDomain}`

    // create a variable of type hosted zone pointing to our hosted zone
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hosted-zone", {
      hostedZoneId: Fn.importValue("eps-route53-resources:EPS-ZoneID"),
      zoneName: Fn.importValue("eps-route53-resources:EPS-domain")
    })

    const jwtKmsKey = new Key(this, "JwtKMSKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-JwtKMSKeyKMSKey`,
      description: `${props.stackName}-JwtKMSKeyKMSKey`,
      enableKeyRotation: true,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: "Enable IAM User Permissions",
            effect: Effect.ALLOW,
            actions: [
              "kms:*"
            ],
            principals: [
              new AccountRootPrincipal
            ],
            resources: ["*"]
          })
        ]
      })
    })
    const useJwtKmsKeyPolicy = new ManagedPolicy(this, "UseJwtKmsKeyPolicy", {
      statements: [
        new PolicyStatement({
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
    let mockToken: LambdaFunction

    // set up things for mock login
    if (props.useMockOidc) {
      if (props.mockOidcjwksEndpoint === undefined ||
        props.mockOidcUserInfoEndpoint === undefined ||
        props.mockOidcTokenEndpoint === undefined ||
        props.mockOidcClientId === undefined ||
        props.mockOidcIssuer === undefined
      ) {
        throw new Error("Attempt to use mock oidc but variables are not defined")
      }

      // lambda for mock token endpoint
      const mockJwtPrivateKey = new Secret(this, "MockJwtPrivateKey", {
        secretName: `${props.stackName!}-mockJwtPrivateKey`,
        secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
        encryptionKey: jwtKmsKey
      })
      const useMockJwtPrivateKey = new ManagedPolicy(this, "UseMockJwtPrivateKey", {
        statements: [
          new PolicyStatement({
            actions: [
              "secretsmanager:GetSecretValue"
            ],
            resources: [
              mockJwtPrivateKey.secretArn
            ]
          })
        ]
      })
      mockToken = new LambdaFunction(this, "MockTokenResources", {
        serviceName: props.serviceName,
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
          UserPoolIdentityProvider: props.mockPoolIdentityProvider.providerName,
          oidcjwksEndpoint: props.mockOidcjwksEndpoint,
          jwtPrivateKeyArn: mockJwtPrivateKey.secretArn,
          userInfoEndpoint: props.mockOidcUserInfoEndpoint,
          useSignedJWT: "false",
          oidcClientId: props.mockOidcClientId,
          oidcIssuer: props.mockOidcIssuer
        }
      })

    }

    // lambda for token endpoint

    const primaryJwtPrivateKey = new Secret(this, "PrimaryJwtPrivateKey", {
      secretName: `${props.stackName!}-primaryJwtPrivateKey`,
      secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
      encryptionKey: jwtKmsKey
    })
    const usePrimaryJwtPrivateKey = new ManagedPolicy(this, "UsePrimaryJwtPrivateKey", {
      statements: [
        new PolicyStatement({
          actions: [
            "secretsmanager:GetSecretValue"
          ],
          resources: [
            primaryJwtPrivateKey.secretArn
          ]
        })
      ]
    })
    const token = new LambdaFunction(this, "TokenResources", {
      serviceName: props.serviceName,
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
        UserPoolIdentityProvider: props.primaryPoolIdentityProvider.providerName,
        oidcjwksEndpoint: props.primaryOidcjwksEndpoint,
        jwtPrivateKeyArn: primaryJwtPrivateKey.secretArn,
        userInfoEndpoint: props.primaryOidcUserInfoEndpoint,
        useSignedJWT: "true",
        oidcClientId: props.primaryOidcClientId,
        oidcIssuer: props.primaryOidcIssuer
      }
    })

    // permissions for api gateway to execute lambdas
    const apiGatewayAdditionalPolicies: Array<IManagedPolicy> = [
      token.executeLambdaManagedPolicy
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
    const authCertificate = new Certificate(this, "certificate", {
      domainName: authDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    const authDomainResource = new DomainName(this, "authApiDomain", {
      securityPolicy: SecurityPolicy.TLS_1_2,
      domainName: authDomain,
      certificate: authCertificate,
      endpointType: EndpointType.REGIONAL
    })

    // set up endpoints on apigateway
    new BasePathMapping(this, "api-gw-base-path-mapping", {
      domainName: authDomainResource,
      restApi: restApiGateway.apiGw
    })

    const tokenResource = restApiGateway.apiGw.root.addResource("token")
    tokenResource.addMethod("POST", new LambdaIntegration(token.lambda, {
      credentialsRole: restApiGateway.apiGwRole
    }))

    // set dns record for api gateway custom domain
    new CnameRecord(this, "api-gw-custom-domain-cname-record", {
      recordName: `auth.${props.stackName}`,
      zone: hostedZone,
      domainName: authDomainResource.domainNameAliasDomainName
    })

    if (props.useMockOidc) {
      const mockTokenResource = restApiGateway.apiGw.root.addResource("mockToken")
      mockTokenResource.addMethod("POST", new LambdaIntegration(mockToken!.lambda, {
        credentialsRole: restApiGateway.apiGwRole
      }))

    }

    // Outputs
  }
}
