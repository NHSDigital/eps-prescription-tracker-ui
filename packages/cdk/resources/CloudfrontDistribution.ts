import {ICertificate} from "aws-cdk-lib/aws-certificatemanager"
import {
  BehaviorOptions,
  Distribution,
  ErrorResponse,
  HttpVersion,
  SecurityPolicyProtocol,
  SSLMethod
} from "aws-cdk-lib/aws-cloudfront"
import {
  AaaaRecord,
  ARecord,
  IHostedZone,
  RecordTarget
} from "aws-cdk-lib/aws-route53"
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets"
import {IBucket} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"

/**
 * Cloudfront distribution and supporting resources

 */

export interface CloudfrontDistributionProps {
  readonly serviceName: string
  readonly stackName: string
  readonly defaultBehavior: BehaviorOptions,
  readonly additionalBehaviors: Record<string, BehaviorOptions>
  readonly errorResponses: Array<ErrorResponse>
  readonly hostedZone: IHostedZone
  readonly shortCloudfrontDomain: string
  readonly fullCloudfrontDomain: string
  readonly cloudfrontLoggingBucket: IBucket
  readonly cloudfrontCert: ICertificate
  readonly webAclAttributeArn: string
  readonly wafAllowGaRunnerConnectivity: boolean
}

/**
 * Resources for a Cloudfront Distribution

 */

export class CloudfrontDistribution extends Construct {
  public readonly distribution

  public constructor(scope: Construct, id: string, props: CloudfrontDistributionProps){
    super(scope, id)

    // Resources
    const cloudfrontDistribution = new Distribution(this, "CloudfrontDistribution", {
      domainNames: [props.fullCloudfrontDomain],
      certificate: props.cloudfrontCert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: SSLMethod.SNI,
      publishAdditionalMetrics: true,
      enableLogging: true,
      logBucket: props.cloudfrontLoggingBucket,
      logFilePrefix: `${props.stackName}/`,
      logIncludesCookies: true, // may actually want to be false, don't know if it includes names of cookies or contents
      defaultBehavior: props.defaultBehavior,
      additionalBehaviors: props.additionalBehaviors,
      errorResponses: props.errorResponses,
      geoRestriction: {
        locations: props.wafAllowGaRunnerConnectivity ? ["GB", "JE", "GG", "IM", "US"] : ["GB", "JE", "GG", "IM"],
        restrictionType: "whitelist"
      }
    })

    if (props.shortCloudfrontDomain === "APEX_DOMAIN") {
      new ARecord(this, "CloudFrontAliasIpv4Record", {
        zone: props.hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution))})

      new AaaaRecord(this, "CloudFrontAliasIpv6Record", {
        zone: props.hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution))})
    } else {
      new ARecord(this, "CloudFrontAliasIpv4Record", {
        zone: props.hostedZone,
        recordName: props.shortCloudfrontDomain,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution))})

      new AaaaRecord(this, "CloudFrontAliasIpv6Record", {
        zone: props.hostedZone,
        recordName: props.shortCloudfrontDomain,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution))})
    }

    // Outputs
    this.distribution = cloudfrontDistribution
  }
}
