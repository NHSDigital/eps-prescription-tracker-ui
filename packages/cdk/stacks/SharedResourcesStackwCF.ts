import {
  App,
  Stack,
  StackProps,
  CfnOutput,
  Fn
} from "aws-cdk-lib"
import {CfnKey, Key} from "aws-cdk-lib/aws-kms"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {RestApi} from "aws-cdk-lib/aws-apigateway"
import {UserPoolDomain} from "aws-cdk-lib/aws-cognito"
import {RestApiGateway} from "../resources/RestApiGateway"
import {StaticContentBucket} from "../resources/StaticContentBucket"
import {
  AccessLevel,
  OriginRequestPolicy,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  HttpVersion,
  SecurityPolicyProtocol,
  SSLMethod,
  AllowedMethods,
  ViewerProtocolPolicy,
  FunctionEventType
} from "aws-cdk-lib/aws-cloudfront"
import {S3BucketOrigin, RestApiOrigin, HttpOrigin} from "aws-cdk-lib/aws-cloudfront-origins"
import {Distribution} from "aws-cdk-lib/aws-cloudfront"
import {AllowCloudfrontKmsKeyAccessPolicy} from "../policies/kms/AllowCloudfrontKmsKeyAccessPolicy"
import {CloudfrontFunction} from "../resources/Cloudfront/CloudfrontFunction"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"

export interface SharedResourcesStackProperties extends StackProps {
  readonly stackName: string
  readonly version: string
  readonly logRetentionInDays: number
  readonly cert: Certificate
}

/**
 * Clinical Prescription Tracker UI Shared Resources

 */

export class SharedResourcesStackwCF extends Stack {
  public readonly staticContentBucket: Bucket
  public staticContentBucketKmsKey: Key
  public readonly apiGateway: RestApi
  public readonly cognitoUserPoolDomain: UserPoolDomain

  public constructor(scope: App, id: string, props: SharedResourcesStackProperties) {
    super(scope, id, props)

    // S3 Static Content Bucket
    const staticContentBucket = new StaticContentBucket(this, "StaticContentBucket")

    // API Gateway
    const apiGateway = new RestApiGateway(this, "ApiGateway", {
      stackName: props.stackName,
      logRetentionInDays: props.logRetentionInDays
    })

    const auditLoggingBucket = Bucket.fromBucketArn(
      this, "AuditLoggingBucket", Fn.importValue("account-resources:AuditLoggingBucket"))

    const staticContentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      staticContentBucket.bucket,
      {
        originAccessLevels: [AccessLevel.READ]
      }
    )

    const apiGatewayOrigin = new RestApiOrigin(apiGateway.restApiGateway, {
      customHeaders: {
        "destination-apigw-id": apiGateway.restApiGateway.restApiId // for later apigw waf stuff
      }
    })

    this.cognitoUserPoolDomain = {} as unknown as UserPoolDomain // placeholder
    const cognitoOrigin = new HttpOrigin(
      `${this.cognitoUserPoolDomain.domainName}.auth.${props.env?.region}.amazoncognito.com`)

    // Origin Request Policies
    // Allow all for now, may want to review these at a later stage
    const apiGatewayRequestPolicy = new OriginRequestPolicy(this, "apiGatewayRequestPolicy", {
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: OriginRequestHeaderBehavior.all()
    })

    const cognitoRequestPolicy = new OriginRequestPolicy(this, "cognitoRequestPolicy", {
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: OriginRequestHeaderBehavior.all()
    })

    // Cache Policies
    // todo - to follow in a later ticket

    // Cloudfront Functions
    const s3404UriRewriteFunction = new CloudfrontFunction(this, "S3404UriRewriteFunction", {
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "404.html"
        }
      ]
    })

    const s3404ModifyStatusCodeFunction = new CloudfrontFunction(this, "S3404ModifyStatusCodeFunction", {
      sourceFileName: "s3404ModifyStatusCode.js"
    })

    const s3StaticContentUriRewriteFunction = new CloudfrontFunction(this, "S3StaticContentUriRewriteFunction", {
      sourceFileName: "s3StaticContentUriRewrite.js",
      keyValues: [
        {
          key: "version",
          value: props.version
        }
      ]
    })

    const apiGatewayStripPathFunction = new CloudfrontFunction(this, "ApiGatewayStripPathFunction", {
      sourceFileName: "genericStripPathUriRewrite.js",
      keyValues: [
        {
          key: "path",
          value: "/api"
        }
      ]
    })

    const cognitoStripPathFunction = new CloudfrontFunction(this, "CognitoStripPathFunction", {
      sourceFileName: "genericStripPathUriRewrite.js",
      keyValues: [
        {
          key: "path",
          value: "/auth"
        }
      ]
    })

    const s3JwksUriRewriteFunction = new CloudfrontFunction(this, "s3JwksUriRewriteFunction", {
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "jwks.json"
        }
      ]
    })

    const epsDomainName = Fn.importValue("eps-route53-resources:EPS-domain")
    // Distribution
    const cloudfrontDistribution = new Distribution(this, "CloudfrontDistribution", {
      domainNames: [epsDomainName],
      certificate: props.cert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2018, // set to 2018 but we may want 2019 or 2021
      sslSupportMethod: SSLMethod.SNI,
      publishAdditionalMetrics: true,
      enableLogging: true,
      logBucket: auditLoggingBucket,
      logFilePrefix: "/cloudfront",
      logIncludesCookies: true, // may actually want to be false, don't know if it includes names of cookies or contents
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
      additionalBehaviors:{
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
          functionAssociations: [
            {
              function: apiGatewayStripPathFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },
        "/auth/*": {
          origin: cognitoOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: cognitoRequestPolicy,
          functionAssociations: [
            {
              function: cognitoStripPathFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },
        "/jwks/": { // matches exactly <url>/jwks and will only serve the jwks json (via cf function)
          origin: staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3JwksUriRewriteFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        }
      }
    })

    // When using an s3 origin with OAC and SSE, cdk will use a wildcard in the generated Key policy condition
    // to match all Distribution IDs in order to avoid a circular dependency between the KMS key,Bucket, and
    // Distribution during the initial deployment. This updates the policy to restrict it to a specific distribution.
    // (This may need to only be added to the stack after initial deployment)
    const contentBucketKmsKey = (staticContentBucket.bucket.node.defaultChild as CfnKey)
    contentBucketKmsKey.keyPolicy = new AllowCloudfrontKmsKeyAccessPolicy(
      this, "StaticContentBucketAllowCloudfrontKmsKeyAccessPolicy", {
        cloudfrontDistributionId: cloudfrontDistribution.distributionId
      }).policyJson

    // Outputs
    this.staticContentBucket = staticContentBucket.bucket
    this.staticContentBucketKmsKey = staticContentBucket.kmsKey
    this.apiGateway = apiGateway.restApiGateway
    // this.cognitoUserPoolDomain = {} as unknown as UserPoolDomain // placeholder

    // Exports
    new CfnOutput(this, "StaticContentBucketArn", {
      value: staticContentBucket.bucket.bucketArn,
      exportName: `${props.stackName}:StaticContentBucket:Arn`
    })

    new CfnOutput(this, "ApiGatewayId", {
      value: apiGateway.restApiGateway.restApiId,
      exportName: `${props.stackName}:ApiGateway:Id`
    })

    new CfnOutput(this, "ApiGatewayRoleArn", {
      value: apiGateway.restAPiGatewayRole.roleArn,
      exportName: `${props.stackName}:ApiGateway:RoleArn`
    })
  }
}
