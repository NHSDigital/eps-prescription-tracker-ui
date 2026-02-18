import {
  StackProps,
  Stack,
  App,
  Fn,
  CfnOutput,
  Duration,
  ArnFormat
} from "aws-cdk-lib"
import {
  AccessLevel,
  AllowedMethods,
  FunctionEventType,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront"
import {RestApiOrigin, S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins"
import {Bucket} from "aws-cdk-lib/aws-s3"

import {RestApiGateway} from "../resources/RestApiGateway"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {nagSuppressions} from "../nagSuppressions"
import {TableV2} from "aws-cdk-lib/aws-dynamodb"
import {ManagedPolicy, Role} from "aws-cdk-lib/aws-iam"
import {SharedSecrets} from "../resources/SharedSecrets"
import {OAuth2Functions} from "../resources/api/oauth2Functions"
import {ApiFunctions} from "../resources/api/apiFunctions"
import {UserPool} from "aws-cdk-lib/aws-cognito"
import {Key} from "aws-cdk-lib/aws-kms"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {RestApiGatewayMethods} from "../resources/RestApiGateway/RestApiGatewayMethods"
import {OAuth2ApiGatewayMethods} from "../resources/RestApiGateway/OAuth2ApiGatewayMethods"
import {CloudfrontBehaviors} from "../resources/CloudfrontBehaviors"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"
import {WebACL} from "../resources/WebApplicationFirewall"
import {CfnWebACLAssociation} from "aws-cdk-lib/aws-wafv2"
import {ukRegionLogGroups} from "../resources/ukRegionLogGroups"
import {CustomSecurityHeadersPolicy} from "../resources/Cloudfront/CustomSecurityHeaders"
export interface StatelessResourcesStackProps extends StackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
  readonly commit: string
}

/**
 * Clinical Prescription Tracker UI Stateless Resources

 */

export class StatelessResourcesStack extends Stack {
  public constructor(scope: App, id: string, props: StatelessResourcesStackProps) {
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const epsDomainName: string = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId: string = this.node.tryGetContext("epsHostedZoneId")
    const cloudfrontCertArn: string = this.node.tryGetContext("cloudfrontCertArn")
    const shortCloudfrontDomain: string = this.node.tryGetContext("shortCloudfrontDomain")
    const fullCloudfrontDomain: string = this.node.tryGetContext("fullCloudfrontDomain")
    const fullCognitoDomain: string = this.node.tryGetContext("fullCognitoDomain")
    const logRetentionInDays: number = Number(this.node.tryGetContext("logRetentionInDays"))
    const logLevel: string = this.node.tryGetContext("logLevel")
    const primaryOidcClientId = this.node.tryGetContext("primaryOidcClientId")
    const primaryOidcTokenEndpoint = this.node.tryGetContext("primaryOidcTokenEndpoint")
    const primaryOidcAuthorizeEndpoint = this.node.tryGetContext("primaryOidcAuthorizeEndpoint")
    const primaryOidcIssuer = this.node.tryGetContext("primaryOidcIssuer")
    const primaryOidcUserInfoEndpoint = this.node.tryGetContext("primaryOidcUserInfoEndpoint")
    const primaryOidcjwksEndpoint = this.node.tryGetContext("primaryOidcjwksEndpoint")

    const mockOidcClientId = this.node.tryGetContext("mockOidcClientId")
    const mockOidcTokenEndpoint = this.node.tryGetContext("mockOidcTokenEndpoint")
    const mockOidcAuthorizeEndpoint = this.node.tryGetContext("mockOidcAuthorizeEndpoint")
    const mockOidcIssuer = this.node.tryGetContext("mockOidcIssuer")
    const mockOidcUserInfoEndpoint = this.node.tryGetContext("mockOidcUserInfoEndpoint")
    const mockOidcjwksEndpoint = this.node.tryGetContext("mockOidcjwksEndpoint")

    const useMockOidc: boolean = this.node.tryGetContext("useMockOidc")
    const apigeeApiKey: string = this.node.tryGetContext("apigeeApiKey")
    const apigeeApiSecret: string = this.node.tryGetContext("apigeeApiSecret")
    const apigeeDoHSApiKey: string = this.node.tryGetContext("apigeeDoHSApiKey")
    const apigeeCIS2TokenEndpoint = this.node.tryGetContext("apigeeCIS2TokenEndpoint")
    const apigeeMockTokenEndpoint = this.node.tryGetContext("apigeeMockTokenEndpoint")
    const apigeePrescriptionsEndpoint = this.node.tryGetContext("apigeePrescriptionsEndpoint")
    const apigeeDoHSEndpoint = this.node.tryGetContext("apigeeDoHSEndpoint")
    const apigeePersonalDemographicsEndpoint = this.node.tryGetContext("apigeePersonalDemographicsEndpoint")
    const jwtKid: string = this.node.tryGetContext("jwtKid")
    const roleId: string = this.node.tryGetContext("roleId")
    const allowLocalhostAccess: boolean = this.node.tryGetContext("allowLocalhostAccess")
    const webAclAttributeArn = this.node.tryGetContext("webAclAttributeArn")
    const wafAllowGaRunnerConnectivity: boolean = this.node.tryGetContext("wafAllowGaRunnerConnectivity")
    const githubAllowListIpv4 = this.node.tryGetContext("githubAllowListIpv4")
    const githubAllowListIpv6 = this.node.tryGetContext("githubAllowListIpv6")
    const cloudfrontOriginCustomHeader = this.node.tryGetContext("cloudfrontOriginCustomHeader")
    const csocUKWafDestination: string = this.node.tryGetContext("csocUKWafDestination")
    const forwardCsocLogs: boolean = this.node.tryGetContext("forwardCsocLogs")

    // Imports
    const baseImportPath = `${props.serviceName}-stateful-resources`

    const staticContentBucketImport = Fn.importValue(`${baseImportPath}:StaticContentBucket:Arn`)

    // CIS2 tokens and user info table
    const tokenMappingTableImport = Fn.importValue(`${baseImportPath}:tokenMappingTable:Arn`)
    const tokenMappingTableReadPolicyImport = Fn.importValue(`${baseImportPath}:tokenMappingTableReadPolicy:Arn`)
    const tokenMappingTableWritePolicyImport = Fn.importValue(`${baseImportPath}:tokenMappingTableWritePolicy:Arn`)
    const useTokensMappingKmsKeyPolicyImport = Fn.importValue(`${baseImportPath}:useTokensMappingKmsKeyPolicy:Arn`)

    // Session management user info table
    const sessionManagementTableImport = Fn.importValue(`${baseImportPath}:sessionManagementTable:Arn`)
    const sessionManagementTableReadPolicyImport =
    Fn.importValue(`${baseImportPath}:sessionManagementTableReadPolicy:Arn`)
    const sessionManagementTableWritePolicyImport =
    Fn.importValue(`${baseImportPath}:sessionManagementTableWritePolicy:Arn`)
    const useSessionManagementKmsKeyPolicyImport =
    Fn.importValue(`${baseImportPath}:useSessionManagementTableKmsKeyPolicy:Arn`)

    // Login proxy state cache
    const stateMappingTableImport = Fn.importValue(`${baseImportPath}:stateMappingTable:Arn`)
    const stateMappingTableReadPolicyImport = Fn.importValue(`${baseImportPath}:stateMappingTableReadPolicy:Arn`)
    const stateMappingTableWritePolicyImport = Fn.importValue(`${baseImportPath}:stateMappingTableWritePolicy:Arn`)
    const useStateMappingKmsKeyPolicyImport = Fn.importValue(`${baseImportPath}:useStateMappingKmsKeyPolicy:Arn`)

    const sessionStateMappingTableImport = Fn.importValue(`${baseImportPath}:sessionStateMappingTable:Arn`)
    const sessionStateMappingTableReadPolicyImport = Fn.importValue(
      `${baseImportPath}:sessionStateMappingTableReadPolicy:Arn`)
    const sessionStateMappingTableWritePolicyImport = Fn.importValue(
      `${baseImportPath}:sessionStateMappingTableWritePolicy:Arn`)
    const useSessionStateMappingKmsKeyPolicyImport = Fn.importValue(
      `${baseImportPath}:useSessionStateMappingKmsKeyPolicy:Arn`)

    // User pool
    const primaryPoolIdentityProviderName = Fn.importValue(`${baseImportPath}:primaryPoolIdentityProvider:Name`)
    const mockPoolIdentityProviderName = Fn.importValue(`${baseImportPath}:mockPoolIdentityProvider:Name`)
    const userPoolImport = Fn.importValue(`${baseImportPath}:userPool:Arn`)
    const userPoolClientId = Fn.importValue(`${baseImportPath}:userPoolClient:userPoolClientId`)

    // Logging
    const cloudwatchKmsKeyImport = Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn")
    const splunkDeliveryStreamImport = Fn.importValue("lambda-resources:SplunkDeliveryStream")
    const splunkSubscriptionFilterRoleImport = Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole")
    const deploymentRoleImport = Fn.importValue("ci-resources:CloudFormationDeployRole")

    // Coerce context and imports to relevant types
    const staticContentBucket = Bucket.fromBucketArn(this, "StaticContentBucket", staticContentBucketImport)

    // Token mapping table
    const tokenMappingTable = TableV2.fromTableArn(this, "tokenMappingTable", tokenMappingTableImport)
    const tokenMappingTableReadPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "tokenMappingTableReadPolicy", tokenMappingTableReadPolicyImport)
    const tokenMappingTableWritePolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "tokenMappingTableWritePolicy", tokenMappingTableWritePolicyImport)
    const useTokensMappingKmsKeyPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "useTokensMappingKmsKeyPolicy", useTokensMappingKmsKeyPolicyImport)

    // Session management table
    const sessionManagementTable = TableV2.fromTableArn(this, "sessionManagementTable", sessionManagementTableImport)
    const sessionManagementTableReadPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "sessionManagementTableReadPolicy", sessionManagementTableReadPolicyImport)

    const sessionManagementTableWritePolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "sessionManagementTableWritePolicy", sessionManagementTableWritePolicyImport)

    const useSessionManagementKmsKeyPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "useSessionManagementTableKmsKeyPolicy", useSessionManagementKmsKeyPolicyImport)

    // State mapping table
    const stateMappingTable = TableV2.fromTableArn(this, "stateMappingTable", stateMappingTableImport)
    const stateMappingTableReadPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "stateMappingTableReadPolicy", stateMappingTableReadPolicyImport)
    const stateMappingTableWritePolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "stateMappingTableWritePolicy", stateMappingTableWritePolicyImport)
    const useStateMappingKmsKeyPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "useStateMappingKmsKeyPolicy", useStateMappingKmsKeyPolicyImport)

    // Session state mapping table
    const sessionStateMappingTable = TableV2.fromTableArn(
      this, "sessionStateMappingTable", sessionStateMappingTableImport)
    const sessionStateMappingTableReadPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "sessionStateMappingTableReadPolicy", sessionStateMappingTableReadPolicyImport)
    const sessionStateMappingTableWritePolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "sessionStateMappingTableWritePolicy", sessionStateMappingTableWritePolicyImport)
    const useSessionStateMappingKmsKeyPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "useSessionStateMappingKmsKeyPolicy", useSessionStateMappingKmsKeyPolicyImport)

    const userPool = UserPool.fromUserPoolArn(
      this, "userPool", userPoolImport)

    const cloudwatchKmsKey = Key.fromKeyArn(
      this, "cloudwatchKmsKey", cloudwatchKmsKeyImport)
    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", splunkDeliveryStreamImport)
    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", splunkSubscriptionFilterRoleImport)

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })
    const cloudfrontCert = Certificate.fromCertificateArn(this, "CloudfrontCert", cloudfrontCertArn)
    const deploymentRole = Role.fromRoleArn(this, "deploymentRole", deploymentRoleImport)

    // Resources

    // SharedSecrets
    const sharedSecrets = new SharedSecrets(this, "SharedSecrets", {
      stackName: props.stackName,
      deploymentRole: deploymentRole,
      useMockOidc: useMockOidc,
      apigeeApiKey: apigeeApiKey,
      apigeeDoHSApiKey: apigeeDoHSApiKey,
      apigeeApiSecret: apigeeApiSecret
    })

    // Functions for the login OAuth2 proxy lambdas
    const oauth2Functions = new OAuth2Functions(this, "OAuth2Functions", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      fullCognitoDomain,

      fullCloudfrontDomain,
      userPoolClientId,
      primaryPoolIdentityProviderName,
      mockPoolIdentityProviderName,

      primaryOidcTokenEndpoint,
      primaryOidcUserInfoEndpoint,
      primaryOidcjwksEndpoint,
      primaryOidcClientId,
      primaryOidcIssuer,
      primaryOidcAuthorizeEndpoint,

      useMockOidc,

      mockOidcTokenEndpoint,
      mockOidcUserInfoEndpoint,
      mockOidcjwksEndpoint,
      mockOidcClientId,
      mockOidcIssuer,
      mockOidcAuthorizeEndpoint,

      tokenMappingTable,
      tokenMappingTableWritePolicy,
      tokenMappingTableReadPolicy,
      useTokensMappingKmsKeyPolicy,

      sessionManagementTable,
      sessionManagementTableWritePolicy,
      sessionManagementTableReadPolicy,
      useSessionManagementKmsKeyPolicy,

      stateMappingTable,
      stateMappingTableWritePolicy,
      stateMappingTableReadPolicy,
      useStateMappingKmsKeyPolicy,

      sessionStateMappingTable,
      sessionStateMappingTableWritePolicy,
      sessionStateMappingTableReadPolicy,
      useSessionStateMappingKmsKeyPolicy,

      sharedSecrets,

      logRetentionInDays,
      logLevel,
      jwtKid,
      apigeeApiKey: sharedSecrets.apigeeApiKey,
      apigeeApiSecret: sharedSecrets.apigeeApiSecret
    })

    // -- functions for API
    const apiFunctions = new ApiFunctions(this, "ApiFunctions", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      primaryOidcTokenEndpoint: primaryOidcTokenEndpoint,
      primaryOidcUserInfoEndpoint: primaryOidcUserInfoEndpoint,
      primaryOidcjwksEndpoint: primaryOidcjwksEndpoint,
      primaryOidcClientId: primaryOidcClientId,
      primaryOidcIssuer: primaryOidcIssuer,
      useMockOidc: useMockOidc,
      mockOidcTokenEndpoint: mockOidcTokenEndpoint,
      mockOidcUserInfoEndpoint: mockOidcUserInfoEndpoint,
      mockOidcjwksEndpoint: mockOidcjwksEndpoint,
      mockOidcClientId: mockOidcClientId,
      mockOidcIssuer: mockOidcIssuer,
      tokenMappingTable: tokenMappingTable,
      tokenMappingTableWritePolicy: tokenMappingTableWritePolicy,
      tokenMappingTableReadPolicy: tokenMappingTableReadPolicy,
      sessionManagementTable: sessionManagementTable,
      sessionManagementTableWritePolicy: sessionManagementTableWritePolicy,
      sessionManagementTableReadPolicy: sessionManagementTableReadPolicy,
      useTokensMappingKmsKeyPolicy: useTokensMappingKmsKeyPolicy,
      useSessionManagementKmsKeyPolicy: useSessionManagementKmsKeyPolicy,
      primaryPoolIdentityProviderName: primaryPoolIdentityProviderName,
      mockPoolIdentityProviderName: mockPoolIdentityProviderName,
      logRetentionInDays: logRetentionInDays,
      logLevel: logLevel,
      sharedSecrets: sharedSecrets,
      apigeeCIS2TokenEndpoint: apigeeCIS2TokenEndpoint,
      apigeeMockTokenEndpoint: apigeeMockTokenEndpoint,
      apigeePrescriptionsEndpoint: apigeePrescriptionsEndpoint,
      apigeeDoHSEndpoint: apigeeDoHSEndpoint,
      apigeeApiKey: sharedSecrets.apigeeApiKey,
      apigeeDoHSApiKey: sharedSecrets.apigeeDoHSApiKey,
      apigeeApiSecret: sharedSecrets.apigeeApiSecret,
      jwtKid: jwtKid,
      roleId: roleId,
      apigeePersonalDemographicsEndpoint: apigeePersonalDemographicsEndpoint,
      fullCloudfrontDomain: fullCloudfrontDomain
    })

    const logGroups = new ukRegionLogGroups(this, "ukRegionLogGroups", {
      cloudwatchKmsKey: cloudwatchKmsKey,
      logRetentionInDays: logRetentionInDays,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole,
      // waf log groups must start with aws-waf-logs-
      wafLogGroupName: `aws-waf-logs-${props.serviceName}-apigw`,
      stackName: this.stackName,
      csocUKWafDestination: csocUKWafDestination,
      forwardCsocLogs: forwardCsocLogs
    })

    // API Gateway WAF Web ACL
    const webAcl = new WebACL(this, "WebAclApiGateway", {
      serviceName: props.serviceName,
      rateLimitTransactions: 3000, // 50 TPS
      rateLimitWindowSeconds: 60, // Minimum is 60 seconds
      githubAllowListIpv4: githubAllowListIpv4,
      githubAllowListIpv6: githubAllowListIpv6,
      wafAllowGaRunnerConnectivity: wafAllowGaRunnerConnectivity,
      scope: "REGIONAL",
      allowedHeaders: new Map<string, string>([
        ["X-Cloudfront-Origin-Secret", cloudfrontOriginCustomHeader]
      ]),
      // waf log destination must not have :* at the end
      // see https://stackoverflow.com/a/73372989/9294145
      wafLogGroupName: Stack.of(this).formatArn({
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        service: "logs",
        resource: "log-group",
        resourceName: logGroups.wafLogGroup.logGroupName
      })
    })

    // - CPT backend API Gateway (/api/*)
    const apiGateway = new RestApiGateway(this, "ApiGateway", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      logRetentionInDays: logRetentionInDays,
      logLevel: logLevel,
      cloudwatchKmsKey: cloudwatchKmsKey,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole,
      userPool: userPool
    })

    // OAuth2 endpoints get their own API Gateway (/oauth2/*)
    const oauth2Gateway = new RestApiGateway(this, "OAuth2Gateway", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      logRetentionInDays: logRetentionInDays,
      logLevel: logLevel,
      cloudwatchKmsKey: cloudwatchKmsKey,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole
    })

    // Associate API Gateways to the WAF
    new CfnWebACLAssociation(this, "apiGatewayAssociation", {
      resourceArn: apiGateway.stageArn,
      webAclArn: webAcl.attrArn
    })

    new CfnWebACLAssociation(this, "oauth2GatewayAssociation", {
      resourceArn: oauth2Gateway.stageArn,
      webAclArn: webAcl.attrArn
    })

    // --- Methods & Resources
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiMethods = new RestApiGatewayMethods(this, "RestApiGatewayMethods", {
      executePolices: [
        ...apiFunctions.apiFunctionsPolicies
      ],
      CIS2SignOutLambda: apiFunctions.CIS2SignOutLambda,
      restAPiGatewayRole: apiGateway.apiGatewayRole,
      restApiGateway: apiGateway.apiGateway,
      prescriptionListLambda: apiFunctions.prescriptionListLambda,
      prescriptionDetailsLambda: apiFunctions.prescriptionDetailsLambda,
      trackerUserInfoLambda: apiFunctions.trackerUserInfoLambda,
      sessionManagementLambda: apiFunctions.sessionManagementLambda,
      selectedRoleLambda: apiFunctions.selectedRoleLambda,
      patientSearchLambda: apiFunctions.patientSearchLambda,
      authorizer: apiGateway.authorizer,
      clearActiveSessionLambda: apiFunctions.clearActiveSessionLambda,
      fakeTimerLambda: apiFunctions.fakeTimerLambda,
      useMockOidc: useMockOidc
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const oauth2Methods = new OAuth2ApiGatewayMethods(this, "OAuth2ApiGatewayMethods", {
      executePolices: [
        ...oauth2Functions.oAuth2Policies
      ],
      oauth2APiGatewayRole: oauth2Gateway.apiGatewayRole,
      oauth2ApiGateway: oauth2Gateway.apiGateway,
      tokenLambda: oauth2Functions.tokenLambda,
      mockTokenLambda: oauth2Functions.mockTokenLambda,
      authorizeLambda: oauth2Functions.authorizeLambda,
      mockAuthorizeLambda: oauth2Functions.mockAuthorizeLambda,
      callbackLambda: oauth2Functions.callbackLambda,
      mockCallbackLambda: oauth2Functions.mockCallbackLambda,
      useMockOidc: useMockOidc
    })

    // - Cloudfront
    // --- Origins for bucket and api gateway
    const staticContentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      staticContentBucket,
      {
        originAccessLevels: [AccessLevel.READ]
      }
    )

    const apiGatewayOrigin = new RestApiOrigin(apiGateway.apiGateway, {
      customHeaders: {
        "destination-api-apigw-id": apiGateway.apiGateway.restApiId, // for later apigw waf stuff
        "X-Cloudfront-Origin-Secret": cloudfrontOriginCustomHeader // Sets custom header used by WAF
      }
    })

    const oauth2GatewayOrigin = new RestApiOrigin(oauth2Gateway.apiGateway, {
      customHeaders: {
        "destination-oauth2-apigw-id": oauth2Gateway.apiGateway.restApiId, // for later apigw waf stuff
        "X-Cloudfront-Origin-Secret": cloudfrontOriginCustomHeader // Sets custom header used by WAF
      }
    })

    // --- Origin Request Policies
    /* Allow all for now, may want to review these at a later stage */
    const apiGatewayRequestPolicy = new OriginRequestPolicy(this, "apiGatewayRequestPolicy", {
      originRequestPolicyName: `${props.serviceName}-ApiGatewayRequestPolicy`,
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: OriginRequestHeaderBehavior.denyList("host"),
      queryStringBehavior: OriginRequestQueryStringBehavior.all()
    })

    const oauth2GatewayRequestPolicy = new OriginRequestPolicy(this, "OAuth2GatewayRequestPolicy", {
      originRequestPolicyName: `${props.serviceName}-OAuth2GatewayRequestPolicy`,
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: OriginRequestHeaderBehavior.denyList("host"),
      queryStringBehavior: OriginRequestQueryStringBehavior.all()
    })

    // --- CloudfrontBehaviors
    const headersPolicy = new CustomSecurityHeadersPolicy(this, "DefaultBehaviourHeadersPolicy", {
      policyName: `${props.serviceName}-CustomSecurityHeaders`,
      fullCognitoDomain: fullCognitoDomain
    })

    const cloudfrontBehaviors = new CloudfrontBehaviors(this, "CloudfrontBehaviors", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      apiGatewayOrigin: apiGatewayOrigin,
      apiGatewayRequestPolicy: apiGatewayRequestPolicy,
      oauth2GatewayOrigin: oauth2GatewayOrigin,
      oauth2GatewayRequestPolicy: oauth2GatewayRequestPolicy,
      staticContentBucketOrigin: staticContentBucketOrigin,
      fullCognitoDomain: fullCognitoDomain
    })

    // --- Distribution
    const cloudfrontDistribution = new CloudfrontDistribution(this, "CloudfrontDistribution", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      hostedZone: hostedZone,
      cloudfrontCert: cloudfrontCert,
      shortCloudfrontDomain: shortCloudfrontDomain,
      fullCloudfrontDomain: fullCloudfrontDomain,
      defaultBehavior: {
        origin: staticContentBucketOrigin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: cloudfrontBehaviors.s3404UriRewriteFunction.function,
            eventType: FunctionEventType.VIEWER_REQUEST
          },
          {
            function: cloudfrontBehaviors.s3404ModifyStatusCodeFunction.function,
            eventType: FunctionEventType.VIEWER_RESPONSE
          }
        ],
        responseHeadersPolicy: headersPolicy.policy
      },
      additionalBehaviors: cloudfrontBehaviors.additionalBehaviors,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: Duration.seconds(10)
        }
      ],
      webAclAttributeArn: webAclAttributeArn,
      wafAllowGaRunnerConnectivity: wafAllowGaRunnerConnectivity
    })

    // Outputs

    // Exports
    new CfnOutput(this, "CloudfrontDistributionId", {
      value: cloudfrontDistribution.distribution.distributionId,
      exportName: `${props.stackName}:cloudfrontDistribution:Id`
    })
    new CfnOutput(this, "CloudfrontDistributionArn", {
      value: cloudfrontDistribution.distribution.distributionArn,
      exportName: `${props.stackName}:cloudfrontDistribution:Arn`
    })
    new CfnOutput(this, "KeyValueStoreArn", {
      value: cloudfrontBehaviors.keyValueStore.keyValueStoreArn,
      exportName: `${props.stackName}:KeyValueStore:Arn`
    })
    new CfnOutput(this, "primaryJwtPrivateKeyArn", {
      value: sharedSecrets.primaryJwtPrivateKey.secretArn,
      exportName: `${props.stackName}:primaryJwtPrivateKey:Arn`
    })
    new CfnOutput(this, "primaryJwtPrivateKeyName", {
      value: sharedSecrets.primaryJwtPrivateKey.secretName,
      exportName: `${props.stackName}:primaryJwtPrivateKey:Name`
    })
    if (useMockOidc) {
      new CfnOutput(this, "mockJwtPrivateKeyArn", {
        value: sharedSecrets.mockJwtPrivateKey.secretArn,
        exportName: `${props.stackName}:mockJwtPrivateKey:Arn`
      })
      new CfnOutput(this, "mockJwtPrivateKeyName", {
        value: sharedSecrets.mockJwtPrivateKey.secretName,
        exportName: `${props.stackName}:mockJwtPrivateKey:Name`
      })
    }
    if (allowLocalhostAccess) {
      new CfnOutput(this, "apigeeApiKey", {
        value: apigeeApiKey,
        exportName: `${props.stackName}:local:apigeeApiKey`
      })
      new CfnOutput(this, "apigeeApiSecret", {
        value: apigeeApiSecret,
        exportName: `${props.stackName}:local:apigeeApiSecret`
      })
      new CfnOutput(this, "apigeeCIS2TokenEndpoint", {
        value: apigeeCIS2TokenEndpoint,
        exportName: `${props.stackName}:local:apigeeCIS2TokenEndpoint`
      })
      new CfnOutput(this, "apigeeDoHSApiKey", {
        value: apigeeDoHSApiKey,
        exportName: `${props.stackName}:local:apigeeDoHSApiKey`
      })
      if (useMockOidc) {
        new CfnOutput(this, "apigeeMockTokenEndpoint", {
          value: apigeeMockTokenEndpoint,
          exportName: `${props.stackName}:local:apigeeMockTokenEndpoint`
        })
      }
      new CfnOutput(this, "apigeePrescriptionsEndpoint", {
        value: apigeePrescriptionsEndpoint,
        exportName: `${props.stackName}:local:apigeePrescriptionsEndpoint`
      })
      new CfnOutput(this, "apigeePersonalDemographicsEndpoint", {
        value: apigeePersonalDemographicsEndpoint,
        exportName: `${props.stackName}:local:apigeePersonalDemographicsEndpoint`
      })
      new CfnOutput(this, "apigeeDoHSEndpoint", {
        value: apigeeDoHSEndpoint,
        exportName: `${props.stackName}:local:apigeeDoHSEndpoint`
      })
      new CfnOutput(this, "jwtKid", {
        value: jwtKid,
        exportName: `${props.stackName}:local:jwtKid`
      })
      new CfnOutput(this, "roleId", {
        value: roleId,
        exportName: `${props.stackName}:local:roleId`
      })
      new CfnOutput(this, "VERSION_NUMBER", {
        value: props.version,
        exportName: `${props.stackName}:local:VERSION-NUMBER`
      })
      new CfnOutput(this, "COMMIT_ID", {
        value: props.commit,
        exportName: `${props.stackName}:local:COMMIT-ID`
      })
    }
    nagSuppressions(this)
  }
}
