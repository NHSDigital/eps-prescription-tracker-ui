import {
  App,
  ArnFormat,
  Names,
  Stack
} from "aws-cdk-lib"
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"
import {AllowList, WebACL} from "../resources/WebApplicationFirewall"
import {usRegionLogGroups} from "../resources/usRegionLogGroups"
import {StandardStackProps} from "@nhsdigital/eps-cdk-constructs"
import {CfnDeliveryDestination} from "aws-cdk-lib/aws-logs"

export interface UsCertsStackProps extends StandardStackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly epsDomainName: string
  readonly epsHostedZoneId: string
  readonly fullCloudfrontDomain: string
  readonly parentCognitoDomain: string
  readonly githubAllowList?: AllowList
  readonly splunkDeliveryStream: string
  readonly splunkSubscriptionFilterRole: string
  readonly logRetentionInDays: number
  readonly csocUSWafDestination?: string
}

/**
 * Clinical Prescription Tracker UI US Certs (us-east-1)

 */

export class UsCertsStack extends Stack {
  public readonly cloudfrontCert: Certificate
  public readonly cognitoCertificate: Certificate
  public readonly fullCognitoDomain: string
  public readonly webAcl: WebACL
  public readonly deliveryDestination: CfnDeliveryDestination

  public constructor(scope: App, id: string, props: UsCertsStackProps) {
    super(scope, id, props)

    // Resources
    // - Cloudfront Cert
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: props.epsHostedZoneId,
      zoneName: props.epsDomainName
    })
    this.cloudfrontCert = new Certificate(this, "CloudfrontCertificate", {
      domainName: props.fullCloudfrontDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    if (!props.isPullRequest) {
      this.fullCognitoDomain = `login.${props.parentCognitoDomain}.${props.epsDomainName}`

      // - cognito cert
      const cognitoCertificate = new Certificate(this, "CognitoCertificate", {
        domainName: this.fullCognitoDomain,
        validation: CertificateValidation.fromDns(hostedZone)
      })

      // we need an DNS A record for custom cognito domain to work
      new ARecord(this, "CognitoARecord", {
        zone: hostedZone,
        target: RecordTarget.fromIpAddresses("127.0.0.1"),
        recordName:  `${props.parentCognitoDomain}.${props.epsDomainName}`
      })

      this.cognitoCertificate = cognitoCertificate
    } else {
      this.fullCognitoDomain = `${props.serviceName}.auth.eu-west-2.amazoncognito.com`
    }

    // log groups in US region
    const logGroups = new usRegionLogGroups(this, "usRegionLogGroups", {
      cloudfrontLogGroupName: props.serviceName,
      // waf log groups must start with aws-waf-logs-
      wafLogGroupName: `aws-waf-logs-${props.serviceName}-cloudfront`,
      logRetentionInDays: props.logRetentionInDays,
      stackName: props.stackName,
      region: this.region,
      account: this.account,
      splunkDeliveryStream: props.splunkDeliveryStream,
      splunkSubscriptionFilterRole: props.splunkSubscriptionFilterRole,
      isPullRequest: props.isPullRequest,
      csocUSWafDestination: props.csocUSWafDestination
    })

    // WAF Web ACL
    this.webAcl = new WebACL(this, "WebAclCF", {
      serviceName: props.serviceName,
      rateLimitTransactions: 3000, // 50 TPS
      rateLimitWindowSeconds: 60, // Minimum is 60 seconds
      githubAllowList: props.githubAllowList,
      scope: "CLOUDFRONT",
      // waf log destination must not have :* at the end
      // see https://stackoverflow.com/a/73372989/9294145
      wafLogGroupName: Stack.of(this).formatArn({
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        service: "logs",
        resource: "log-group",
        resourceName: logGroups.wafLogGroup.logGroupName
      })
    })

    // cloudfront log group - needs to be in us-east-1 region
    this.deliveryDestination = new CfnDeliveryDestination(this, "DistributionDeliveryDestination", {
      name: `${Names.uniqueResourceName(this, {maxLength:55})}-dest`,
      destinationResourceArn: logGroups.cloudfrontLogGroup.logGroupArn,
      outputFormat: "json"
    })
  }
}
