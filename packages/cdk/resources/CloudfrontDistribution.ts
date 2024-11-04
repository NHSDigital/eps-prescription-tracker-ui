import {ICertificate} from "aws-cdk-lib/aws-certificatemanager"
import {
  BehaviorOptions,
  Distribution,
  ErrorResponse,
  HttpVersion,
  SecurityPolicyProtocol,
  SSLMethod
} from "aws-cdk-lib/aws-cloudfront"
import {CnameRecord, IHostedZone} from "aws-cdk-lib/aws-route53"
import {IBucket} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"

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
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2018, // set to 2018 but we may want 2019 or 2021
      sslSupportMethod: SSLMethod.SNI,
      publishAdditionalMetrics: true,
      enableLogging: true,
      logBucket: props.cloudfrontLoggingBucket,
      logFilePrefix: "cloudfront/",
      logIncludesCookies: true, // may actually want to be false, don't know if it includes names of cookies or contents
      defaultBehavior: props.defaultBehavior,
      additionalBehaviors: props.additionalBehaviors,
      errorResponses: props.errorResponses
    })

    new CnameRecord(this, "CloudfrontCnameRecord", {
      recordName: props.shortCloudfrontDomain,
      zone: props.hostedZone,
      domainName: cloudfrontDistribution.distributionDomainName
    })

    // Outputs
    this.distribution = cloudfrontDistribution
  }
}
