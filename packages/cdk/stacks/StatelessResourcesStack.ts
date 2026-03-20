import {
  Stack,
  App,
  Fn,
  CfnOutput,
  ArnFormat
} from "aws-cdk-lib"
import {StandardStackProps} from "@nhsdigital/eps-cdk-constructs"
import {AccessLevel} from "aws-cdk-lib/aws-cloudfront"
import {RestApiOrigin, S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins"

import {RestApiGateway} from "../resources/RestApiGateway"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {nagSuppressions} from "../nagSuppressions"
import {Role} from "aws-cdk-lib/aws-iam"
import {SharedSecrets} from "../resources/SharedSecrets"
import {OAuth2Functions} from "../resources/api/oauth2Functions"
import {ApiFunctions} from "../resources/api/apiFunctions"
import {Key} from "aws-cdk-lib/aws-kms"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {RestApiGatewayMethods} from "../resources/RestApiGateway/RestApiGatewayMethods"
import {OAuth2ApiGatewayMethods} from "../resources/RestApiGateway/OAuth2ApiGatewayMethods"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"
import {AllowList, WebACL} from "../resources/WebApplicationFirewall"
import {CfnWebACLAssociation} from "aws-cdk-lib/aws-wafv2"
import {ukRegionLogGroups} from "../resources/ukRegionLogGroups"
import {Dynamodb} from "../resources/Dynamodb"
import {Cognito, OidcConfig} from "../resources/Cognito"
import {CloudfrontLogDelivery} from "../resources/CloudfrontLogDelivery"
import {Rum} from "../resources/Rum"
import {StaticContentBucket} from "../resources/StaticContentBucket"
import {StaticContentDeployment} from "../resources/StaticContentDeployment"

export interface StatelessResourcesStackProps extends StandardStackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly cloudfrontCert: Certificate
  readonly dynamodb: Dynamodb
  readonly route53ExportName: string
  readonly useZoneApex: boolean
  readonly fullCloudfrontDomain: string
  readonly fullCognitoDomain: string
  readonly logRetentionInDays: number
  readonly logLevel: string
  readonly reactLogLevel: string
  readonly primaryOidcConfig: OidcConfig
  readonly mockOidcConfig?: OidcConfig
  readonly apigeeCIS2TokenEndpoint: string
  readonly apigeeMockTokenEndpoint: string
  readonly apigeePrescriptionsEndpoint: string
  readonly apigeeDoHSEndpoint: string
  readonly apigeePersonalDemographicsEndpoint: string
  readonly jwtKid: string
  readonly webAclUS: WebACL
  readonly githubAllowList?: AllowList
  readonly cloudfrontOriginCustomHeader: string
  readonly csocUKWafDestination?: string
  readonly staticContentBucket: StaticContentBucket
  readonly cognito: Cognito
  readonly logDelivery: CloudfrontLogDelivery
  readonly allowLocalhostAccess: boolean
  readonly rum: Rum
  readonly sharedSecrets: SharedSecrets
}

/**
 * Clinical Prescription Tracker UI Stateless Resources

 */

export class StatelessResourcesStack extends Stack {
  public constructor(scope: App, id: string, props: StatelessResourcesStackProps) {
    super(scope, id, props)

    // Imports
    const cloudwatchKmsKey = Key.fromKeyArn(
      this, "cloudwatchKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))
    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))
    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    const epsHostedZoneId = Fn.importValue(`eps-route53-resources:${props.route53ExportName}-ZoneID`)
    const epsDomainName = Fn.importValue(`eps-route53-resources:${props.route53ExportName}-domain`)
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    // Resources

    // Functions for the login OAuth2 proxy lambdas
    const oauth2Functions = new OAuth2Functions(this, "OAuth2Functions", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      fullCognitoDomain: props.fullCognitoDomain,

      fullCloudfrontDomain: props.fullCloudfrontDomain,
      cognito: props.cognito,

      primaryOidcConfig: props.primaryOidcConfig,
      mockOidcConfig: props.mockOidcConfig,

      dynamodb: props.dynamodb,

      sharedSecrets: props.sharedSecrets,

      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      jwtKid: props.jwtKid,
      version: props.version,
      commitId: props.commitId
    })

    // -- functions for API
    const apiFunctions = new ApiFunctions(this, "ApiFunctions", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      primaryOidcConfig: props.primaryOidcConfig,
      mockOidcConfig: props.mockOidcConfig,
      dynamodb: props.dynamodb,
      cognito: props.cognito,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      sharedSecrets: props.sharedSecrets,
      apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
      apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint,
      apigeePrescriptionsEndpoint: props.apigeePrescriptionsEndpoint,
      apigeeDoHSEndpoint: props.apigeeDoHSEndpoint,
      jwtKid: props.jwtKid,
      apigeePersonalDemographicsEndpoint: props.apigeePersonalDemographicsEndpoint,
      fullCloudfrontDomain: props.fullCloudfrontDomain,
      version: props.version,
      commitId: props.commitId
    })

    const logGroups = new ukRegionLogGroups(this, "ukRegionLogGroups", {
      cloudwatchKmsKey: cloudwatchKmsKey,
      logRetentionInDays: props.logRetentionInDays,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole,
      // waf log groups must start with aws-waf-logs-
      wafLogGroupName: `aws-waf-logs-${props.serviceName}-apigw`,
      stackName: this.stackName,
      csocUKWafDestination: props.csocUKWafDestination
    })

    // API Gateway WAF Web ACL
    const webAcl = new WebACL(this, "WebAclApiGateway", {
      serviceName: props.serviceName,
      rateLimitTransactions: 3000, // 50 TPS
      rateLimitWindowSeconds: 60, // Minimum is 60 seconds
      githubAllowList: props.githubAllowList,
      scope: "REGIONAL",
      allowedHeaders: new Map<string, string>([
        ["X-Cloudfront-Origin-Secret", props.cloudfrontOriginCustomHeader]
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
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      cloudwatchKmsKey: cloudwatchKmsKey,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole,
      userPool: props.cognito.userPool
    })

    // OAuth2 endpoints get their own API Gateway (/oauth2/*)
    const oauth2Gateway = new RestApiGateway(this, "OAuth2Gateway", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
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
      setLastActivityTimerLambda: apiFunctions.setLastActivityTimerLambda,
      useMockOidc: !!props.mockOidcConfig
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
      useMockOidc: !!props.mockOidcConfig
    })

    // - Cloudfront
    // --- Origins for bucket and api gateway
    const staticContentDeployment = new StaticContentDeployment(this, "StaticContentDeployment", {
      account: this.account,
      region: this.region,
      serviceName: props.serviceName,
      stackName: props.stackName,
      environment: props.environment,
      version: props.version,
      commitId: props.commitId,
      cloudwatchKmsKey,
      cognito: props.cognito,
      fullCloudfrontDomain: props.fullCloudfrontDomain,
      fullCognitoDomain: props.fullCognitoDomain,
      logRetentionInDays: props.logRetentionInDays,
      reactLogLevel: props.reactLogLevel,
      rum: props.rum,
      staticContentBucket: props.staticContentBucket
    })
    const staticContentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      staticContentDeployment.deployedBucket,
      {
        originAccessLevels: [AccessLevel.READ],
        originPath: "/" + props.version
      }
    )

    const apiGatewayOrigin = new RestApiOrigin(apiGateway.apiGateway, {
      customHeaders: {
        "destination-api-apigw-id": apiGateway.apiGateway.restApiId, // for later apigw waf stuff
        "X-Cloudfront-Origin-Secret": props.cloudfrontOriginCustomHeader // Sets custom header used by WAF
      }
    })

    const oauth2GatewayOrigin = new RestApiOrigin(oauth2Gateway.apiGateway, {
      customHeaders: {
        "destination-oauth2-apigw-id": oauth2Gateway.apiGateway.restApiId, // for later apigw waf stuff
        "X-Cloudfront-Origin-Secret": props.cloudfrontOriginCustomHeader // Sets custom header used by WAF
      }
    })

    // --- Distribution
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cloudfrontDistribution = new CloudfrontDistribution(this, "CloudfrontDistribution", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      hostedZone: hostedZone,
      cloudfrontCert: props.cloudfrontCert,
      useZoneApex: props.useZoneApex,
      fullCloudfrontDomain: props.fullCloudfrontDomain,
      webAcl: props.webAclUS,
      wafAllowGaRunnerConnectivity: !!props.githubAllowList,
      logDelivery: props.logDelivery,
      apiGatewayOrigin: apiGatewayOrigin,
      oauth2GatewayOrigin: oauth2GatewayOrigin,
      staticContentBucketOrigin: staticContentBucketOrigin,
      fullCognitoDomain: props.fullCognitoDomain
    })

    // Outputs

    // Exports
    if (props.allowLocalhostAccess) {
      new CfnOutput(this, "jwtKid", {
        value: props.jwtKid,
        exportName: `${props.stackName}:local:jwtKid`
      })
      new CfnOutput(this, "VERSION_NUMBER", {
        value: props.version,
        exportName: `${props.stackName}:local:VERSION-NUMBER`
      })
      new CfnOutput(this, "COMMIT_ID", {
        value: props.commitId,
        exportName: `${props.stackName}:local:COMMIT-ID`
      })
    }
    nagSuppressions(this, !!props.mockOidcConfig)
  }
}
