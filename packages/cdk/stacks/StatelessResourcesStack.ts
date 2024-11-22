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
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"

export interface StatelessResourcesStackProps extends StackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
}

/**
 * Clinical Prescription Tracker UI Stateless Resources

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

    const useMockOidc: boolean = this.node.tryGetContext("useMockOidc")

    // Imports
    const baseImportPath = `${props.serviceName}-stateful-resources`

    const staticContentBucketImport = Fn.importValue(`${baseImportPath}:StaticContentBucket:Arn`)
    const tokenMappingTableImport = Fn.importValue(`${baseImportPath}:tokenMappingTable:Arn`)
    const tokenMappingTableReadPolicyImport = Fn.importValue(`${baseImportPath}:tokenMappingTableReadPolicy:Arn`)
    const tokenMappingTableWritePolicyImport = Fn.importValue(`${baseImportPath}:tokenMappingTableWritePolicy:Arn`)
    const useTokensMappingKmsKeyPolicyImport = Fn.importValue(`${baseImportPath}:useTokensMappingKmsKeyPolicy:Arn`)
    const primaryPoolIdentityProviderName = Fn.importValue(`${baseImportPath}:primaryPoolIdentityProvider:Name`)
    const mockPoolIdentityProviderName = Fn.importValue(`${baseImportPath}:mockPoolIdentityProvider:Name`)
    const userPoolImport = Fn.importValue(`${baseImportPath}:userPool:Arn`)
    const cloudfrontLoggingBucketImport = Fn.importValue("account-resources:CloudfrontLoggingBucket")
    const cloudwatchKmsKeyImport = Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn")
    const splunkDeliveryStreamImport = Fn.importValue("lambda-resources:SplunkDeliveryStream")
    const splunkSubscriptionFilterRoleImport = Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole")
    const deploymentRoleImport = Fn.importValue("ci-resources:CloudFormationDeployRole")

    // Coerce context and imports to relevant types
    const staticContentBucket = Bucket.fromBucketArn( this, "StaticContentBucket", staticContentBucketImport)
    const tokenMappingTable = TableV2.fromTableArn( this, "tokenMappingTable", tokenMappingTableImport)
    const tokenMappingTableReadPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "tokenMappingTableReadPolicy", tokenMappingTableReadPolicyImport)
    const tokenMappingTableWritePolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "tokenMappingTableWritePolicy", tokenMappingTableWritePolicyImport)
    const useTokensMappingKmsKeyPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "useTokensMappingKmsKeyPolicy", useTokensMappingKmsKeyPolicyImport)
    const userPool = UserPool.fromUserPoolArn(
      this, "userPool", userPoolImport)
    const cloudfrontLoggingBucket = Bucket.fromBucketArn(
      this, "CloudfrontLoggingBucket", cloudfrontLoggingBucketImport)
    const cloudwatchKmsKey = Key.fromKeyArn(
      this, "cloudwatchKmsKey", cloudwatchKmsKeyImport)
    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", splunkDeliveryStreamImport)
    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", splunkSubscriptionFilterRoleImport )
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })
    const cloudfrontCert = Certificate.fromCertificateArn(this, "CloudfrontCert", cloudfrontCertArn)
    const deploymentRole = Role.fromRoleArn(this, "deploymentRole", deploymentRoleImport)

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
      mockPoolIdentityProviderName: mockPoolIdentityProviderName,
      logRetentionInDays: logRetentionInDays,
      deploymentRole: deploymentRole
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
      executePolices: [
        ...cognitoFunctions.cognitoPolicies
      ],
      restAPiGatewayRole: apiGateway.restAPiGatewayRole,
      restApiGateway: apiGateway.restApiGateway,
      tokenLambda: cognitoFunctions.tokenLambda,
      mockTokenLambda: cognitoFunctions.mockTokenLambda,
      useMockOidc: useMockOidc,
      authorizer: apiGateway.authorizer
    })

    // - Cloudfront
    // --- Origins for bucket and api gateway
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

    // --- CloudfrontBehaviors
    const cloudfrontBehaviors = new CloudfrontBehaviors(this, "CloudfrontBehaviors", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      apiGatewayOrigin: apiGatewayOrigin,
      apiGatewayRequestPolicy: apiGatewayRequestPolicy,
      staticContentBucketOrigin: staticContentBucketOrigin
    })

    // --- Distribution
    const cloudfrontDistribution = new CloudfrontDistribution(this, "CloudfrontDistribution", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      hostedZone: hostedZone,
      cloudfrontCert: cloudfrontCert,
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
    new CfnOutput(this, "primaryJwtPrivateKeyArn", {
      value: cognitoFunctions.primaryJwtPrivateKey.secretArn,
      exportName: `${props.stackName}:primaryJwtPrivateKey:Arn`
    })
    new CfnOutput(this, "primaryJwtPrivateKeyName", {
      value: cognitoFunctions.primaryJwtPrivateKey.secretName,
      exportName: `${props.stackName}:primaryJwtPrivateKey:Name`
    })
    if (useMockOidc) {
      new CfnOutput(this, "mockJwtPrivateKeyArn", {
        value: cognitoFunctions.mockJwtPrivateKey.secretArn,
        exportName: `${props.stackName}:mockJwtPrivateKey:Arn`
      })
      new CfnOutput(this, "mockJwtPrivateKeyName", {
        value: cognitoFunctions.mockJwtPrivateKey.secretName,
        exportName: `${props.stackName}:mockJwtPrivateKey:Name`
      })
    }
    nagSuppressions(this)
  }
}
