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
import {Construct} from "constructs"
import {WebACL} from "../resources/WebApplicationFirewall"
import {CfnDelivery, CfnDeliverySource} from "aws-cdk-lib/aws-logs"
import {Names} from "aws-cdk-lib"
import {CloudfrontLogDelivery} from "./CloudfrontLogDelivery"

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
  readonly useZoneApex: boolean
  readonly fullCloudfrontDomain: string
  readonly cloudfrontCert: ICertificate
  readonly webAcl: WebACL
  readonly wafAllowGaRunnerConnectivity: boolean
  readonly logDelivery: CloudfrontLogDelivery
}

/**
 * Resources for a Cloudfront Distribution

 */

export class CloudfrontDistribution extends Construct {
  public readonly distribution: Distribution

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
      enableLogging: false,
      logIncludesCookies: true, // may actually want to be false, don't know if it includes names of cookies or contents
      defaultBehavior: props.defaultBehavior,
      additionalBehaviors: props.additionalBehaviors,
      errorResponses: props.errorResponses,
      geoRestriction: {
        locations: props.wafAllowGaRunnerConnectivity ? ["GB", "JE", "GG", "IM", "US"] : ["GB", "JE", "GG", "IM"],
        restrictionType: "whitelist"
      },
      webAclId: props.webAcl.attrArn
    })

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
