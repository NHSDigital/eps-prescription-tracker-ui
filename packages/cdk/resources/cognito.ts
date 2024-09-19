/* eslint-disable @typescript-eslint/no-unused-vars */
import * as cdk from "aws-cdk-lib"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as route53 from "aws-cdk-lib/aws-route53"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import * as iam from "aws-cdk-lib/aws-iam"

import {ApiResources} from "./apiResources"
import {LambdaResources} from "./lambdaResources"
import {Construct} from "constructs"
import * as path from "path"
import {
  apiGwLogFormat,
  getDefaultLambdaOptions,
  getLambdaArn,
  getLambdaInvokeURL
} from "./helpers"

const baseDir = path.resolve(__dirname, "../../..")
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

    const environmentDomain = `${props.stackName}.${cdk.Fn.importValue("eps-route53-resources:EPS-domain")}`
    const idDomain = `id.${environmentDomain}`
    const authDomain = `auth.${environmentDomain}`
    const baseApiGwUrl = `https://${authDomain}`
    const baseIdGwUrl = `https://${idDomain}`

    const generateCertificate = new certificatemanager.CfnCertificate(this, "GenerateCertificate", {
      validationMethod: "DNS",
      domainName: authDomain,
      domainValidationOptions: [
        {
          domainName: authDomain,
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
      lambdaArn: getLambdaArn(props.region, props.account, `${props.stackName}-token`),
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
      name: environmentDomain,
      type: "A",
      hostedZoneId: cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID"),
      resourceRecords: [
        "127.0.0.1"
      ],
      ttl: "900"
    })

    const restApiDomain = new apigateway.CfnDomainName(this, "RestApiDomain", {
      domainName: authDomain,
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
        tokenResources.executeLambdaPolicyArn
      ],
      apiName: `${props.stackName!}-apigw-cognito`,
      logRetentionInDays: 30
    })

    const tokenApiGatewayResource = new apigateway.CfnResource(this, "TokenAPIGatewayResource", {
      restApiId: restApiGateway.ref,
      parentId: restApiGateway.attrRootResourceId,
      pathPart: "token"
    })

    const userPoolDomain = new cognito.CfnUserPoolDomain(this, "UserPoolDomain", {
      userPoolId: userPool.ref,
      customDomainConfig: {
        certificateArn: props.userPoolTlsCertificateArn
      },
      domain: idDomain
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
        "jwks_uri": props.primaryOidcjwksEndpoint!,
        "authorize_url": props.primaryOidcAuthorizeEndpoint,
        "token_url": `${baseApiGwUrl}/token`
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
      name: authDomain,
      type: "A",
      hostedZoneId: cdk.Fn.importValue("eps-route53-resources:EPS-ZoneID"),
      aliasTarget: {
        dnsName: restApiDomain.attrRegionalDomainName,
        hostedZoneId: restApiDomain.attrRegionalHostedZoneId
      }
    })

    const tokenOptions = getDefaultLambdaOptions({
      functionName: `${props.stackName!}-token`,
      packageBasePath: "packages/cognito",
      entryPoint: "src/token.ts"
    })

    const token = new nodeLambda.NodejsFunction(this, "tokenLambda", {
      ...tokenOptions,
      role: iam.Role.fromRoleArn(this, "tokenResourcesRole", tokenResources.lambdaRoleArn),
      environment: {
        "idp_token_path": props.primaryOidcTokenEndpoint!,
        TokenMappingTableName: props.tokenMappingTableName!,
        UserPoolIdentityProvider: userPoolIdentityProvider.ref,
        "jwks_uri": props.primaryOidcjwksEndpoint!
      }
    })

    const userPoolDomainRecordSet = new route53.CfnRecordSet(this, "UserPoolDomainRecordSet", {
      name: idDomain,
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
        uri: getLambdaInvokeURL(props.region, token.functionArn)
      }
    })

    const restApiGatewayDeploymentB = new apigateway.CfnDeployment(this, "RestApiGatewayDeploymentB", {
      restApiId: restApiGateway.ref
    })
    restApiGatewayDeploymentB.addDependency(tokenMethod)

    const restApiGatewayStage = new apigateway.CfnStage(this, "RestApiGatewayStage", {
      restApiId: restApiGateway.ref,
      stageName: "prod",
      deploymentId: restApiGatewayDeploymentB.ref,
      tracingEnabled: true,
      accessLogSetting: {
        destinationArn: restApiGatewayResources.apiGwAccessLogsArn,
        format: apiGwLogFormat
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
