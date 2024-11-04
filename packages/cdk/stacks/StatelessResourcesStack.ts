import {
  StackProps,
  Stack,
  App,
  Fn,
  CfnOutput,
  Duration
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
import {CognitoFunctions} from "../resources/CognitoFunctions"
import {UserPool} from "aws-cdk-lib/aws-cognito"
import {Key} from "aws-cdk-lib/aws-kms"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {RestApiGatewayMethods} from "../resources/RestApiGatewayMethods"
import {CloudfrontBehaviors} from "../resources/CloudfrontBehaviors"

export interface StatelessResourcesStackProps extends StackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
}

/**
 * Clinical Prescription Tracker UI Stateful Resources

 */

export class StatelessResourcesStack extends Stack {
  public constructor(scope: App, id: string, props: StatelessResourcesStackProps){
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const epsDomainName: string = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId: string = this.node.tryGetContext("epsHostedZoneId")
    const cloudfrontCertArn: string = this.node.tryGetContext("cloudfrontCertArn")
    const shortCloudfrontDomain: string = this.node.tryGetContext("shortCloudfrontDomain")
    const fullCloudfrontDomain: string = this.node.tryGetContext("fullCloudfrontDomain")
    const logRetentionInDays: number = Number(this.node.tryGetContext("logRetentionInDays"))
    const primaryOidcClientId = this.node.tryGetContext("primaryOidcClientId")
    const primaryOidcTokenEndpoint = this.node.tryGetContext("primaryOidcTokenEndpoint")
    const primaryOidcIssuer = this.node.tryGetContext("primaryOidcIssuer")
    const primaryOidcUserInfoEndpoint = this.node.tryGetContext("primaryOidcUserInfoEndpoint")
    const primaryOidcjwksEndpoint = this.node.tryGetContext("primaryOidcjwksEndpoint")

    const mockOidcClientId = this.node.tryGetContext("mockOidcClientId")
    const mockOidcTokenEndpoint = this.node.tryGetContext("mockOidcTokenEndpoint")
    const mockOidcIssuer = this.node.tryGetContext("mockOidcIssuer")
    const mockOidcUserInfoEndpoint = this.node.tryGetContext("mockOidcUserInfoEndpoint")
    const mockOidcjwksEndpoint = this.node.tryGetContext("mockOidcjwksEndpoint")

    const useMockOidc = this.node.tryGetContext("useMockOidc")

    // Imports
    const staticContentBucket = Bucket.fromBucketArn(
      this, "StaticContentBucket", Fn.importValue(`${props.serviceName}-stateful-resources:StaticContentBucket:Arn`))
    const tokenMappingTable = TableV2.fromTableArn(
      this, "tokenMappingTable", Fn.importValue(`${props.serviceName}-stateful-resources:tokenMappingTable:Arn`))
    const tokenMappingTableReadPolicy = ManagedPolicy.fromManagedPolicyArn(
      // eslint-disable-next-line max-len
      this, "tokenMappingTableReadPolicy", Fn.importValue(`${props.serviceName}-stateful-resources:tokenMappingTableReadPolicy:Arn`))
    const tokenMappingTableWritePolicy = ManagedPolicy.fromManagedPolicyArn(
      // eslint-disable-next-line max-len
      this, "tokenMappingTableWritePolicy", Fn.importValue(`${props.serviceName}-stateful-resources:tokenMappingTableWritePolicy:Arn`))
    const useTokensMappingKmsKeyPolicy = ManagedPolicy.fromManagedPolicyArn(
      // eslint-disable-next-line max-len
      this, "useTokensMappingKmsKeyPolicy", Fn.importValue(`${props.serviceName}-stateful-resources:useTokensMappingKmsKeyPolicy:Arn`))
    // eslint-disable-next-line max-len
    const primaryPoolIdentityProviderName = Fn.importValue(`${props.serviceName}-stateful-resources:primaryPoolIdentityProvider:Name`)
    // eslint-disable-next-line max-len
    const mockPoolIdentityProviderName = Fn.importValue(`${props.serviceName}-stateful-resources:mockPoolIdentityProvider:Name`)
    const userPool = UserPool.fromUserPoolArn(
      this, "userPool", Fn.importValue(`${props.serviceName}-stateful-resources:userPool:Arn`))
    const cloudfrontLoggingBucket = Bucket.fromBucketArn(
      this, "CloudfrontLoggingBucket", Fn.importValue("account-resources:CloudfrontLoggingBucket"))
    const cloudwatchKmsKey = Key.fromKeyArn(
      this, "cloudwatchKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))

    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    // Resources
    // -- functions for cognito
    const cognitoFunctions = new CognitoFunctions(this, "CognitoFunctions", {
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
      useTokensMappingKmsKeyPolicy: useTokensMappingKmsKeyPolicy,
      primaryPoolIdentityProviderName: primaryPoolIdentityProviderName,
      mockPoolIdentityProviderName: mockPoolIdentityProviderName
    })
    // - API Gateway

    const apiGateway = new RestApiGateway(this, "ApiGateway", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      logRetentionInDays: logRetentionInDays,
      cloudwatchKmsKey: cloudwatchKmsKey,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole,
      userPool: userPool
    })

    // --- Methods & Resources
    new RestApiGatewayMethods(this, "RestApiGatewayMethods", {
      extraPolices: [
        ...cognitoFunctions.cognitoPolicies
      ],
      restAPiGatewayRole: apiGateway.restAPiGatewayRole,
      restApiGateway: apiGateway.restApiGateway,
      tokenLambda: cognitoFunctions.tokenLambda,
      mockTokenLambda: cognitoFunctions.mockTokenLambda,
      useMockOidc: useMockOidc,
      authorizer: apiGateway.authorizer
    })

    // token endpoint

    // - Cloudfront
    // --- Origins
    const staticContentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      staticContentBucket,
      {
        originAccessLevels: [AccessLevel.READ]
      }
    )

    const apiGatewayOrigin = new RestApiOrigin(apiGateway.restApiGateway, {
      customHeaders: {
        "destination-apigw-id": apiGateway.restApiGateway.restApiId // for later apigw waf stuff
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

    // --- Cache Policies
    /* todo - to follow in a later ticket */

    const cloudfrontBehaviors = new CloudfrontBehaviors(this, "CloudfrontBehaviors", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      apiGatewayOrigin: apiGatewayOrigin,
      apiGatewayRequestPolicy: apiGatewayRequestPolicy,
      staticContentBucketOrigin: staticContentBucketOrigin
    })

    // --- Functions
    // --- Distribution
    const cloudfrontDistribution = new CloudfrontDistribution(this, "CloudfrontDistribution", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      epsDomainName: epsDomainName,
      epsHostedZoneId: epsHostedZoneId,
      cloudfrontCertArn: cloudfrontCertArn,
      shortCloudfrontDomain: shortCloudfrontDomain,
      fullCloudfrontDomain: fullCloudfrontDomain,
      cloudfrontLoggingBucket: cloudfrontLoggingBucket,
      defaultBehavior: {
        origin: staticContentBucketOrigin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations:[
          {
            function: cloudfrontBehaviors.s3404UriRewriteFunction.function,
            eventType: FunctionEventType.VIEWER_REQUEST
          },
          {
            function: cloudfrontBehaviors.s3404ModifyStatusCodeFunction.function,
            eventType: FunctionEventType.VIEWER_RESPONSE
          }
        ]
      },
      additionalBehaviors: cloudfrontBehaviors.additionalBehaviors,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: Duration.seconds(10)
        }
      ]
    })

    // Outputs

    // Exports
    new CfnOutput(this, "CloudfrontDistributionId", {
      value: cloudfrontDistribution.distribution.distributionId,
      exportName: `${props.stackName}:cloudfrontDistribution:Id`
    })
    new CfnOutput(this, "StaticRewriteKeyValueStoreArn", {
      value: cloudfrontBehaviors.s3StaticContentUriRewriteFunction.functionStore?.keyValueStoreArn,
      exportName: `${props.stackName}:StaticRewriteKeyValueStor:Arn`
    })

    nagSuppressions(this)
  }
}
