import {Fn} from "aws-cdk-lib"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"
import {
  BehaviorOptions,
  Distribution,
  ErrorResponse,
  HttpVersion,
  SecurityPolicyProtocol,
  SSLMethod
} from "aws-cdk-lib/aws-cloudfront"
import {CnameRecord, HostedZone} from "aws-cdk-lib/aws-route53"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"

export interface CloudfrontDistributionProps {
  serviceName: string
  stackName: string
  defaultBehavior: BehaviorOptions,
  additionalBehaviors: Record<string, BehaviorOptions>
  errorResponses: Array<ErrorResponse>
  epsHostedZoneId: string
  epsDomainName: string
  cloudfrontCertArn: string
  shortCloudfrontDomain: string
  fullCloudfrontDomain: string
}

/**
 * Resources for a Cloudfront Distribution

 */

export class CloudfrontDistribution extends Construct {
  public readonly distribution

  public constructor(scope: Construct, id: string, props: CloudfrontDistributionProps){
    super(scope, id)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    // Imports
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: props.epsHostedZoneId,
      zoneName: props.epsDomainName
    })

    const cloudfrontCert = Certificate.fromCertificateArn(this, "CloudfrontCert", props.cloudfrontCertArn)

    const cloudfrontLoggingBucket = Bucket.fromBucketArn(
      this, "CloudfrontLoggingBucket", Fn.importValue("account-resources:CloudfrontLoggingBucket"))

    // Resources
    const cloudfrontDistribution = new Distribution(this, "CloudfrontDistribution", {
      domainNames: [props.fullCloudfrontDomain],
      certificate: cloudfrontCert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2018, // set to 2018 but we may want 2019 or 2021
      sslSupportMethod: SSLMethod.SNI,
      publishAdditionalMetrics: true,
      enableLogging: true,
      logBucket: cloudfrontLoggingBucket,
      logFilePrefix: "cloudfront/",
      logIncludesCookies: true, // may actually want to be false, don't know if it includes names of cookies or contents
      defaultBehavior: props.defaultBehavior,
      additionalBehaviors: props.additionalBehaviors,
      errorResponses: props.errorResponses
    })

    new CnameRecord(this, "CloudfrontCnameRecord", {
      recordName: props.shortCloudfrontDomain,
      zone: hostedZone,
      domainName: cloudfrontDistribution.distributionDomainName
    })

    // Outputs
    this.distribution = cloudfrontDistribution
  }
}
