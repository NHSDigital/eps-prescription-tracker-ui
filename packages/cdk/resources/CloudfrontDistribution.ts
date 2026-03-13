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
import {
  AaaaRecord,
  ARecord,
  IHostedZone,
  RecordTarget
} from "aws-cdk-lib/aws-route53"
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets"
import {Construct} from "constructs"
import {WebACL} from "../resources/WebApplicationFirewall"
import {CfnDelivery, CfnDeliverySource} from "aws-cdk-lib/aws-logs"
import {Annotations, Duration, Names} from "aws-cdk-lib"
import {CloudfrontLogDelivery} from "./CloudfrontLogDelivery"
import {CustomSecurityHeadersPolicy} from "./Cloudfront/CustomSecurityHeaders"
import {RestApiOrigin} from "aws-cdk-lib/aws-cloudfront-origins"
import {resolve} from "path"

/**
 * Cloudfront distribution and supporting resources

 */

export interface CloudfrontDistributionProps {
  readonly serviceName: string
  readonly stackName: string
  readonly hostedZone: IHostedZone
  readonly useZoneApex: boolean
  readonly fullCloudfrontDomain: string
  readonly cloudfrontCert: ICertificate
  readonly webAcl: WebACL
  readonly wafAllowGaRunnerConnectivity: boolean
  readonly logDelivery: CloudfrontLogDelivery
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
    const s3StaticContentUriRewriteFunction = new Function(this, "Function", {
      functionName: `${props.serviceName}-S3StaticContentUriRewriteFunction`,
      code: FunctionCode.fromFile({
        filePath: resolve(__dirname, `../../../cloudfrontFunctions/src/s3StaticContentUriRewrite.js`)
      }),
      runtime: FunctionRuntime.JS_2_0,
      autoPublish: true
    })

    const s3StaticContentRootSlashRedirect = new Function(this, "Function", {
      functionName: `${props.serviceName}-S3StaticContentRootSlashRedirect`,
      code: FunctionCode.fromFile({
        filePath: resolve(__dirname, `../../../cloudfrontFunctions/src/s3StaticContentRootSlashRedirect.js`)
      }),
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

    const cloudfrontDistribution = new Distribution(this, "CloudfrontDistribution", {
      domainNames: [props.fullCloudfrontDomain],
      certificate: props.cloudfrontCert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: SSLMethod.SNI,
      publishAdditionalMetrics: true,
      enableLogging: false,
      logIncludesCookies: true, // may actually want to be false, don't know if it includes names of cookies or contents
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

    Annotations.of(cloudfrontDistribution).acknowledgeWarning(
      "@aws-cdk/aws-cloudfront-origins:updateImportedBucketPolicyOac",
      "Policy already allows all distributions in this account to access the bucket"
    )

    const distDeliverySource = new CfnDeliverySource(this, "DistributionDeliverySource", {
      name: `${Names.uniqueResourceName(this, {maxLength:55})}-src`,
      logType: "ACCESS_LOGS",
      resourceArn: cloudfrontDistribution.distributionArn
    })

    const delivery = new CfnDelivery(this, "DistributionDelivery", {
      deliverySourceName: distDeliverySource.name,
      deliveryDestinationArn: props.logDelivery.deliveryDestination.attrArn
    })
    delivery.node.addDependency(distDeliverySource)

    if (props.useZoneApex) {
      new ARecord(this, "CloudFrontAliasIpv4Record", {
        zone: props.hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution))})

      new AaaaRecord(this, "CloudFrontAliasIpv6Record", {
        zone: props.hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution))})
    } else {
      new ARecord(this, "CloudFrontAliasIpv4Record", {
        zone: props.hostedZone,
        recordName: props.serviceName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution))})

      new AaaaRecord(this, "CloudFrontAliasIpv6Record", {
        zone: props.hostedZone,
        recordName: props.serviceName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution))})
    }

    // Outputs
    this.distribution = cloudfrontDistribution
  }
}
