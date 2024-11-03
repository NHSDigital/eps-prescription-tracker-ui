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
  CachePolicy,
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
import {CloudfrontFunction} from "../resources/Cloudfront/CloudfrontFunction"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {nagSuppressions} from "../nagSuppressions"
import {TableV2} from "aws-cdk-lib/aws-dynamodb"
import {ManagedPolicy, Role} from "aws-cdk-lib/aws-iam"
import {CognitoFunctions} from "../resources/CognitoFunctions"
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  MockIntegration,
  PassthroughBehavior
} from "aws-cdk-lib/aws-apigateway"
import {UserPool} from "aws-cdk-lib/aws-cognito"
import {Key} from "aws-cdk-lib/aws-kms"
import {Stream} from "aws-cdk-lib/aws-kinesis"

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
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole
    })

    const authorizer = new CognitoUserPoolsAuthorizer(this, "Authorizer", {
      authorizerName: "cognitoAuth",
      cognitoUserPools: [userPool],
      identitySource: "method.request.header.authorization"
    })

    // --- Methods & Resources

    // token endpoint
    for (var policy of cognitoFunctions.cognitoPolicies) {
      apiGateway.restAPiGatewayRole.addManagedPolicy(policy)
    }
    const tokenResource = apiGateway.restApiGateway.root.addResource("token")
    tokenResource.addMethod("POST", new LambdaIntegration(cognitoFunctions.tokenLambda, {
      credentialsRole: apiGateway.restAPiGatewayRole
    }))

    // mocktoken endpoint
    if (useMockOidc) {
      const mockTokenResource = apiGateway.restApiGateway.root.addResource("mocktoken")
      mockTokenResource.addMethod("POST", new LambdaIntegration(cognitoFunctions.mockTokenLambda, {
        credentialsRole: apiGateway.restAPiGatewayRole
      }))
    }

    /* Dummy Method/Resource to test cognito auth */
    const mockTeapotResource = apiGateway.restApiGateway.root.addResource("418")
    mockTeapotResource.addMethod("GET", new MockIntegration({
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": `{
                "statusCode": 418
              }
            `
      },
      integrationResponses: [
        {
          statusCode: "418",
          responseTemplates: {
            "application/json": `{
                  "id": "teapot"
                  "message": "I am not a coffee pot"
              }`
          }
        }
      ]
    })
    )

    const mockAuthResource = apiGateway.restApiGateway.root.addResource("401")
    mockAuthResource.addMethod("GET", new MockIntegration({
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": `{
                "statusCode": 401
              }
            `
      },
      integrationResponses: [
        {
          statusCode: "401",
          responseTemplates: {
            "application/json": `{
                  "message": "this should have an authorization"
              }`
          }
        }
      ]
    })
    , {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: authorizer
    })

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

    // --- Functions
    const s3404UriRewriteFunction = new CloudfrontFunction(this, "S3404UriRewriteFunction", {
      functionName: `${props.serviceName}-S3404UriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "404.html"
        }
      ]
    })

    const s3404ModifyStatusCodeFunction = new CloudfrontFunction(this, "S3404ModifyStatusCodeFunction", {
      functionName: `${props.serviceName}-S3404ModifyStatusCodeFunction`,
      sourceFileName: "s3404ModifyStatusCode.js"
    })

    const s3500UriRewriteFunction = new CloudfrontFunction(this, "S3500UriRewriteFunction", {
      functionName: `${props.serviceName}-S3500UriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "500.html"
        }
      ]
    })

    const s3StaticContentUriRewriteFunction = new CloudfrontFunction(this, "S3StaticContentUriRewriteFunction", {
      functionName: `${props.serviceName}-S3StaticContentUriRewriteFunction`,
      sourceFileName: "s3StaticContentUriRewrite.js"
    })

    const apiGatewayStripPathFunction = new CloudfrontFunction(this, "ApiGatewayStripPathFunction", {
      functionName: `${props.serviceName}-ApiGatewayStripPathFunction`,
      sourceFileName: "genericStripPathUriRewrite.js",
      keyValues: [
        {
          key: "path",
          value: "/api"
        }
      ]
    })

    const s3JwksUriRewriteFunction = new CloudfrontFunction(this, "s3JwksUriRewriteFunction", {
      functionName: `${props.serviceName}-s3JwksUriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "jwks.json"
        }
      ]
    })

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
            function: s3404UriRewriteFunction.function,
            eventType: FunctionEventType.VIEWER_REQUEST
          },
          {
            function: s3404ModifyStatusCodeFunction.function,
            eventType: FunctionEventType.VIEWER_RESPONSE
          }
        ]
      },
      additionalBehaviors: {
        "/site/*": {
          origin: staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3StaticContentUriRewriteFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },
        "/api/*": {
          origin: apiGatewayOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: apiGatewayRequestPolicy,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          functionAssociations: [
            {
              function: apiGatewayStripPathFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },
        "/jwks/": {/* matches exactly <url>/jwks and will only serve the jwks json (via cf function) */
          origin: staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3JwksUriRewriteFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },

        "/500.html": { // matches exactly <url>/500.html and will only serve the 500.html page (via cf function)
          origin: staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3500UriRewriteFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        }
      },
      errorResponses: [
        {
          httpStatus: 500,
          responseHttpStatus: 500,
          responsePagePath: "/500.html",
          ttl: Duration.seconds(10)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: Duration.seconds(10)
        }
      ]
    })

    /* Resources to add:
      - api gateway resources
      - lambdas
      - state machines
    */

    // Outputs

    // Exports
    new CfnOutput(this, "CloudfrontDistributionId", {
      value: cloudfrontDistribution.distribution.distributionId,
      exportName: `${props.stackName}:cloudfrontDistribution:Id`
    })
    new CfnOutput(this, "StaticRewriteKeyValueStoreArn", {
      value: s3StaticContentUriRewriteFunction.functionStore?.keyValueStoreArn,
      exportName: `${props.stackName}:StaticRewriteKeyValueStor:Arn`
    })

    nagSuppressions(this)
  }
}
