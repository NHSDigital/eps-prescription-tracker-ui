import {ICertificate} from "aws-cdk-lib/aws-certificatemanager"
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HttpVersion,
  IOrigin,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  SecurityPolicyProtocol,
  SSLMethod,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront"
import {Construct} from "constructs"
import {WebACL} from "../resources/WebApplicationFirewall"
import {Annotations, Duration} from "aws-cdk-lib"
import {CustomSecurityHeadersPolicy} from "./Cloudfront/CustomSecurityHeaders"
import {RestApiOrigin} from "aws-cdk-lib/aws-cloudfront-origins"
import {resolve} from "path"
import {readFileSync} from "fs"

/**
 * Cloudfront distribution and supporting resources

 */

export interface CloudfrontDistributionProps {
  readonly serviceName: string
  readonly stackName: string
  readonly fullCloudfrontDomain: string
  readonly cloudfrontCert: ICertificate
  readonly webAcl: WebACL
  readonly wafAllowGaRunnerConnectivity: boolean
  readonly apiGatewayOrigin: RestApiOrigin
  readonly oauth2GatewayOrigin: RestApiOrigin
  readonly staticContentBucketOrigin: IOrigin
  readonly fullCognitoDomain: string
}

/**
 * Resources for a Cloudfront Distribution

 */

export class CloudfrontDistribution extends Construct {
  public readonly distribution: Distribution

  public constructor(scope: Construct, id: string, props: CloudfrontDistributionProps){
    super(scope, id)

    // Resources
    const s3StaticContentUriRewriteCode = readFileSync(
      resolve(__dirname, `../../cloudfrontFunctions/src/s3StaticContentUriRewrite.js`), "utf8")
    const s3StaticContentUriRewriteFunction = new Function(this, "S3StaticContentUriRewriteFunction", {
      functionName: `${props.serviceName}-S3StaticContentUriRewriteFunction`,
      code: FunctionCode.fromInline(s3StaticContentUriRewriteCode.replace("export ", "")),
      runtime: FunctionRuntime.JS_2_0,
      autoPublish: true
    })

    const s3StaticContentRootSlashRedirectCode = readFileSync(
      resolve(__dirname, `../../cloudfrontFunctions/src/s3StaticContentRootSlashRedirect.js`), "utf8")
    const s3StaticContentRootSlashRedirect = new Function(this, "S3StaticContentRootSlashRedirect", {
      functionName: `${props.serviceName}-S3StaticContentRootSlashRedirect`,
      code: FunctionCode.fromInline(s3StaticContentRootSlashRedirectCode.replace("export ", "")),
      runtime: FunctionRuntime.JS_2_0,
      autoPublish: true
    })

    /* Add dependency on previous function to force them to build one by one to avoid aws limits
    on how many can be created simultaneously */
    s3StaticContentRootSlashRedirect.node.addDependency(s3StaticContentUriRewriteFunction)

    const headersPolicy = new CustomSecurityHeadersPolicy(this, "AdditionalBehavioursHeadersPolicy", {
      policyName: `${props.serviceName}-AdditionalBehavioursCustomSecurityHeaders`,
      fullCognitoDomain: props.fullCognitoDomain
    })

    const apiGatewayRequestPolicy = new OriginRequestPolicy(this, "apiGatewayRequestPolicy", {
      originRequestPolicyName: `${props.serviceName}-ApiGatewayRequestPolicy`,
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: OriginRequestHeaderBehavior.denyList("host"),
      queryStringBehavior: OriginRequestQueryStringBehavior.all()
    })

    this.distribution = new Distribution(this, "CloudfrontDistribution", {
      domainNames: [props.fullCloudfrontDomain],
      certificate: props.cloudfrontCert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: SSLMethod.SNI,
      publishAdditionalMetrics: true,
      enableLogging: false,
      logIncludesCookies: false,
      defaultBehavior: {
        origin: props.staticContentBucketOrigin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: headersPolicy.policy,
        functionAssociations: [
          {
            function: s3StaticContentRootSlashRedirect,
            eventType: FunctionEventType.VIEWER_REQUEST
          }
        ]
      },
      additionalBehaviors: {
        "/site*": {
          origin: props.staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3StaticContentUriRewriteFunction,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ],
          responseHeadersPolicy: headersPolicy.policy
        },
        "/api/*": {
          origin: props.apiGatewayOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: apiGatewayRequestPolicy,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          responseHeadersPolicy: headersPolicy.policy
        },
        "/oauth2/*": {
          origin: props.oauth2GatewayOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: apiGatewayRequestPolicy,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          responseHeadersPolicy: headersPolicy.policy
        },
        "/jwks.json": {
          origin: props.staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: headersPolicy.policy
        },
        "/500.html": {
          origin: props.staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: headersPolicy.policy
        },
        "/404.html": {
          origin: props.staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: headersPolicy.policy
        },
        "/404.css": {
          origin: props.staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS
        }
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: Duration.seconds(10)
        },
        {
          httpStatus: 500,
          responseHttpStatus: 500,
          responsePagePath: "/500.html",
          ttl: Duration.seconds(10)
        }
      ],
      geoRestriction: {
        locations: props.wafAllowGaRunnerConnectivity ? ["GB", "JE", "GG", "IM", "US"] : ["GB", "JE", "GG", "IM"],
        restrictionType: "whitelist"
      },
      webAclId: props.webAcl.attrArn
    })

    Annotations.of(this.distribution).acknowledgeWarning(
      "@aws-cdk/aws-cloudfront-origins:updateImportedBucketPolicyOac",
      "Policy already allows all distributions in this account to access the bucket"
    )
  }
}
