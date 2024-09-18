/* eslint-disable @typescript-eslint/no-unused-vars */
import * as cdk from "aws-cdk-lib"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as route53 from "aws-cdk-lib/aws-route53"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import * as lambda from "aws-cdk-lib/aws-lambda"

import {ApiResources} from "./apiResources"
import {LambdaResources} from "./lambdaResources"
import {Construct} from "constructs"
import path = require("path");

export interface CognitoProps {
  /**
   */
  readonly stackName: string;
  /**
   */
  readonly primaryOidcClientId: string;
  /**
   */
  readonly primaryOidClientSecret: string;
  /**
   */
  readonly primaryOidcIssuer: string;
  /**
   */
  readonly primaryOidcAuthorizeEndpoint: string;
  /**
   */
  readonly primaryOidcTokenEndpoint: string;
  /**
   */
  readonly primaryOidcUserInfoEndpoint: string;
  /**
   */
  readonly primaryOidcjwksEndpoint: string;
  /**
   */
  readonly tokenMappingTableName: string;
  /**
   */
  readonly userPoolTlsCertificateArn: string;
  readonly region: string;
  readonly account: string;
  readonly tokenMappingTableWritePolicyArn: string;
  readonly tokenMappingTableReadPolicyArn: string;
  readonly useTokensMappingKMSKeyPolicyArn: string
}

/**
 * AWS Cognito User Pool
 */
export class Cognito extends Construct {
  /**
   * ID of the created Cognito User Pool
   */
  public readonly userPoolId
  /**
   * ID of the created Cognito User Pool
   */
  public readonly userPoolArn
  /**
   * ID of the created Cognito User Pool client
   */
  public readonly userPoolClientId
  /**
   * Hosted login domain
   */
  public readonly hostedLoginDomain

  public constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id)

    // Transforms

    // Resources
    const authResources = new LambdaResources(this, "AuthResources",
      {
        stackName: props.stackName!,
        lambdaName: `${props.stackName!}-auth`,
        lambdaArn: `arn:aws:lambda:${props.region}:${props.account}:function:${props.stackName!}-auth`,
        includeAdditionalPolicies: false,
        logRetentionInDays: 30
      }
    )

    const callbackResources = new LambdaResources(this, "CallbackResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-callback`,
      lambdaArn: `arn:aws:lambda:${props.region}:${props.account}:function:${props.stackName!}-callback`,
      includeAdditionalPolicies: false,
      logRetentionInDays: 30
    })

    const generateCertificate = new certificatemanager.CfnCertificate(this, "GenerateCertificate", {
      validationMethod: "DNS",
      domainName: [
        "auth",
        props.stackName!,
        cdk.Fn.importValue("eps-route53-resources:EPS-domain")
      ].join("."),
      domainValidationOptions: [
        {
          domainName: [
            "auth",
            props.stackName!,
            cdk.Fn.importValue("eps-route53-resources:EPS-domain")
          ].join("."),
          hostedZoneId: cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID")
        }
      ]
    })

    const restApiGateway = new apigateway.CfnRestApi(this, "RestApiGateway", {
      name: `${props.stackName!}-apigw-cognito`,
      endpointConfiguration: {
        types: [
          "REGIONAL"
        ]
      }
    })

    const tokenResources = new LambdaResources(this, "TokenResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-token`,
      lambdaArn: `arn:aws:lambda:${props.region}:${props.account}:function:${props.stackName!}-token`,
      includeAdditionalPolicies: true,
      additionalPolicies: [
        props.tokenMappingTableWritePolicyArn,
        props.tokenMappingTableReadPolicyArn,
        props.useTokensMappingKMSKeyPolicyArn
      ],
      logRetentionInDays: 30
    })

    const userPool = new cognito.CfnUserPool(this, "UserPool", {
      usernameAttributes: [
        "email"
      ],
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: true
      }
    })

    const userPoolARecordSet = new route53.CfnRecordSet(this, "UserPoolARecordSet", {
      name: [
        props.stackName!,
        cdk.Fn.importValue("eps-route53-resources:EPS-domain")
      ].join("."),
      type: "A",
      hostedZoneId: cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID"),
      resourceRecords: [
        "127.0.0.1"
      ],
      ttl: "900"
    })

    const auth = new nodeLambda.NodejsFunction(this, "authLambda", {
      functionName: `${props.stackName!}-auth`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../cognito/src/auth.ts"),
      projectRoot: path.join(__dirname, "../"),
      memorySize: 1024,
      handler: "auth.handler",
      bundling: {
        minify: true,
        sourceMap: true,
        tsconfig: "../cognito/tsconfig.json",
        target: "es2020"
      },
      environment: {
        "idp_auth_uri": props.primaryOidcAuthorizeEndpoint!
      }
    })

    const authApiGatewayResource = new apigateway.CfnResource(this, "AuthAPIGatewayResource", {
      restApiId: restApiGateway.ref,
      parentId: restApiGateway.attrRootResourceId,
      pathPart: "auth"
    })

    const callback = new nodeLambda.NodejsFunction(this, "callbackLambda", {
      functionName: `${props.stackName!}-callback`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../cognito/src/callback.ts"),
      projectRoot: path.join(__dirname, "../"),
      memorySize: 1024,
      handler: "callback.handler",
      bundling: {
        minify: true,
        sourceMap: true,
        tsconfig: "../cognito/tsconfig.json",
        target: "es2020"
      },
      environment: {
        "idp_auth_uri": props.primaryOidcAuthorizeEndpoint!
      }
    })

    const callbackApiGatewayResource = new apigateway.CfnResource(this, "CallbackAPIGatewayResource", {
      restApiId: restApiGateway.ref,
      parentId: restApiGateway.attrRootResourceId,
      pathPart: "callback"
    })

    const restApiDomain = new apigateway.CfnDomainName(this, "RestApiDomain", {
      domainName: [
        "auth",
        props.stackName!,
        cdk.Fn.importValue("eps-route53-resources:EPS-domain")
      ].join("."),
      regionalCertificateArn: generateCertificate.ref,
      endpointConfiguration: {
        types: [
          "REGIONAL"
        ]
      },
      securityPolicy: "TLS_1_2"
    })

    const restApiGatewayResources = new ApiResources(this, "RestApiGatewayResources", {
      additionalPolicies: [
        tokenResources.executeLambdaPolicyArn,
        callbackResources.executeLambdaPolicyArn,
        authResources.executeLambdaPolicyArn
      ],
      apiName: `${props.stackName!}-apigw-cognito`,
      logRetentionInDays: 30
    })

    const tokenApiGatewayResource = new apigateway.CfnResource(this, "TokenAPIGatewayResource", {
      restApiId: restApiGateway.ref,
      parentId: restApiGateway.attrRootResourceId,
      pathPart: "token"
    })

    // const userPoolDomain = new cognito.CfnUserPoolDomain(this, "UserPoolDomain", {
    //   userPoolId: userPool.ref,
    //   customDomainConfig: {
    //     certificateArn: props.userPoolTlsCertificateArn!
    //   },
    //   domain: [
    //     "id",
    //     props.stackName!,
    //     cdk.Fn.importValue("eps-route53-resources:EPS-domain")
    //   ].join(".")
    // })

    const userPoolDomain = new cognito.CfnUserPoolDomain(this, "UserPoolDomain", {
      userPoolId: userPool.ref,
      domain: "id"
    })
    userPoolDomain.addDependency(userPoolARecordSet)

    const userPoolIdentityProvider = new cognito.CfnUserPoolIdentityProvider(this, "UserPoolIdentityProvider", {
      userPoolId: userPool.ref,
      providerName: "Primary",
      providerType: "OIDC",
      providerDetails: {
        "oidc_issuer": props.primaryOidcIssuer!,
        "authorize_scopes": "openid profile email",
        "attributes_request_method": "GET",
        "client_id": props.primaryOidcClientId!,
        "client_secret": props.primaryOidClientSecret!,
        "attributes_url": props.primaryOidcUserInfoEndpoint!,
        "jwks_uri": props.primaryOidcjwksEndpoint!
      },
      attributeMapping: {
        username: "sub",
        email: "email",
        "email_verified": "email_verified",
        "phone_number": "phone_number",
        "phone_number_verified": "phone_number_verified",
        profile: "profile"
      }
    })

    const authMethod = new apigateway.CfnMethod(this, "AuthMethod", {
      restApiId: restApiGateway.ref,
      resourceId: authApiGatewayResource.ref,
      httpMethod: "GET",
      authorizationType: "NONE",
      integration: {
        type: "AWS_PROXY",
        credentials: restApiGatewayResources.apiGwRoleArn,
        integrationHttpMethod: "POST",
        uri: `arn:aws:apigateway:${props.region}:lambda:path/2015-03-31/functions/${auth.functionArn}/invocations`
      }
    })

    const callbackMethod = new apigateway.CfnMethod(this, "CallbackMethod", {
      restApiId: restApiGateway.ref,
      resourceId: callbackApiGatewayResource.ref,
      httpMethod: "GET",
      authorizationType: "NONE",
      integration: {
        type: "AWS_PROXY",
        credentials: restApiGatewayResources.apiGwRoleArn,
        integrationHttpMethod: "POST",
        uri: `arn:aws:apigateway:${props.region}:lambda:path/2015-03-31/functions/${callback.functionArn}/invocations`
      }
    })

    const clientUserPool = new cognito.CfnUserPoolClient(this, "ClientUserPool", {
      allowedOAuthFlowsUserPoolClient: true,
      allowedOAuthFlows: [
        "code"
      ],
      allowedOAuthScopes: [
        "openid",
        "email",
        "phone",
        "profile",
        "aws.cognito.signin.user.admin"
      ],
      callbackUrLs: [
        "http://localhost:3000/auth/"
      ],
      logoutUrLs: [
        "http://localhost:3000/"
      ],
      supportedIdentityProviders: [
        "COGNITO",
        userPoolIdentityProvider.ref
      ],
      userPoolId: userPool.ref
    })
    clientUserPool.addDependency(userPoolIdentityProvider)

    const restApiRecordSet = new route53.CfnRecordSet(this, "RestApiRecordSet", {
      name: [
        "auth",
        props.stackName!,
        cdk.Fn.importValue("eps-route53-resources:EPS-domain")
      ].join("."),
      type: "A",
      hostedZoneId: cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID"),
      aliasTarget: {
        dnsName: restApiDomain.attrRegionalDomainName,
        hostedZoneId: restApiDomain.attrRegionalHostedZoneId
      }
    })

    const token = new nodeLambda.NodejsFunction(this, "tokenLambda", {
      functionName: `${props.stackName!}-token`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../cognito/src/token.ts"),
      projectRoot: path.join(__dirname, "../"),
      memorySize: 1024,
      handler: "token.handler",
      bundling: {
        minify: true,
        sourceMap: true,
        tsconfig: "../cognito/tsconfig.json",
        target: "es2020"
      },
      environment: {
        "idp_token_path": props.primaryOidcTokenEndpoint!,
        TokenMappingTableName: props.tokenMappingTableName!,
        UserPoolIdentityProvider: userPoolIdentityProvider.ref,
        "jwks_uri": props.primaryOidcjwksEndpoint!
      }
    })

    const userPoolDomainRecordSet = new route53.CfnRecordSet(this, "UserPoolDomainRecordSet", {
      name: [
        "id",
        props.stackName!,
        cdk.Fn.importValue("eps-route53-resources:EPS-domain")
      ].join("."),
      type: "A",
      hostedZoneId: cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID"),
      aliasTarget: {
        dnsName: userPoolDomain.attrCloudFrontDistribution,
        evaluateTargetHealth: false,
        hostedZoneId: "Z2FDTNDATAQYW2"
      }
    })

    const tokenMethod = new apigateway.CfnMethod(this, "TokenMethod", {
      restApiId: restApiGateway.ref,
      resourceId: tokenApiGatewayResource.ref,
      httpMethod: "POST",
      authorizationType: "NONE",
      integration: {
        type: "AWS_PROXY",
        credentials: restApiGatewayResources.apiGwRoleArn,
        integrationHttpMethod: "POST",
        uri: `arn:aws:apigateway:${props.region}:lambda:path/2015-03-31/functions/${token.functionArn}/invocations`
      }
    })

    const restApiGatewayDeploymentB = new apigateway.CfnDeployment(this, "RestApiGatewayDeploymentB", {
      restApiId: restApiGateway.ref
    })
    restApiGatewayDeploymentB.addDependency(authMethod)
    restApiGatewayDeploymentB.addDependency(callbackMethod)
    restApiGatewayDeploymentB.addDependency(tokenMethod)

    const restApiGatewayStage = new apigateway.CfnStage(this, "RestApiGatewayStage", {
      restApiId: restApiGateway.ref,
      stageName: "prod",
      deploymentId: restApiGatewayDeploymentB.ref,
      tracingEnabled: true,
      accessLogSetting: {
        destinationArn: restApiGatewayResources.apiGwAccessLogsArn,
        // eslint-disable-next-line max-len, no-useless-escape
        format: '{ \"requestTime\": \"$context.requestTime\", \"apiId\": \"$context.apiId\", \"accountId\": \"$context.accountId\", \"resourcePath\": \"$context.resourcePath\", \"stage\": \"$context.stage\", \"requestId\": \"$context.requestId\", \"extendedRequestId\": \"$context.extendedRequestId\", \"status\": \"$context.status\", \"httpMethod\": \"$context.httpMethod\", \"protocol\": \"$context.protocol\", \"path\": \"$context.path\", \"responseLatency\": \"$context.responseLatency\", \"responseLength\": \"$context.responseLength\", \"domainName\": \"$context.domainName\", \"identity\": { \"sourceIp\": \"$context.identity.sourceIp\", \"userAgent\": \"$context.identity.userAgent\", \"clientCert\":{ \"subjectDN\": \"$context.identity.clientCert.subjectDN\", \"issuerDN\": \"$context.identity.clientCert.issuerDN\", \"serialNumber\": \"$context.identity.clientCert.serialNumber\", \"validityNotBefore\": \"$context.identity.clientCert.validity.notBefore\", \"validityNotAfter\": \"$context.identity.clientCert.validity.notAfter\" }}, \"integration\":{ \"error\": \"$context.integration.error\", \"integrationStatus\": \"$context.integration.integrationStatus\", \"latency\": \"$context.integration.latency\", \"requestId\": \"$context.integration.requestId\", \"status\": \"$context.integration.status\" }}'
      }
    })

    const restApiDomainMapping = new apigateway.CfnBasePathMapping(this, "RestApiDomainMapping", {
      domainName: restApiDomain.ref,
      restApiId: restApiGateway.ref,
      stage: restApiGatewayStage.ref
    })

    // Outputs
    this.userPoolId = userPool.ref
    this.userPoolArn = userPool.attrArn
    this.userPoolClientId = clientUserPool.ref
    this.hostedLoginDomain = userPoolDomain.ref
  }
}
