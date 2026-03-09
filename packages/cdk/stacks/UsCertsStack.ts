import {App, ArnFormat, Stack} from "aws-cdk-lib"
import {ARecord, IHostedZone, RecordTarget} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"
import {AllowList, WebACL} from "../resources/WebApplicationFirewall"
import {CloudfrontLogDelivery} from "../resources/CloudfrontLogDelivery"
import {usRegionLogGroups} from "../resources/usRegionLogGroups"
import {StandardStackProps} from "@nhsdigital/eps-cdk-constructs"

export interface UsCertsStackProps extends StandardStackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly hostedZone: IHostedZone
  readonly fullCloudfrontDomain: string
  readonly shortCognitoDomain: string
  readonly parentCognitoDomain: string
  readonly githubAllowList?: AllowList
}

/**
 * Clinical Prescription Tracker UI US Certs (us-east-1)

 */

export class UsCertsStack extends Stack {
  public readonly cloudfrontCert: Certificate
  public readonly cognitoCertificate: Certificate
  public readonly fullCognitoDomain: string
  public readonly webAcl: WebACL
  public readonly logDelivery: CloudfrontLogDelivery

  public constructor(scope: App, id: string, props: UsCertsStackProps) {
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const useCustomCognitoDomain = !props.isPullRequest
    const splunkDeliveryStream: string = this.node.tryGetContext("splunkDeliveryStream")
    const splunkSubscriptionFilterRole: string = this.node.tryGetContext("splunkSubscriptionFilterRole")
    const cloudfrontDistributionArn: string = this.node.tryGetContext("cloudfrontDistributionArn")
    const logRetentionInDays: number = Number(this.node.tryGetContext("logRetentionInDays"))
    const isPullRequest: boolean = this.node.tryGetContext("isPullRequest")
    const csocUSWafDestination: string = this.node.tryGetContext("csocUSWafDestination")
    const forwardCsocLogs: boolean = this.node.tryGetContext("forwardCsocLogs")

    // Resources
    // - Cloudfront Cert
    this.cloudfrontCert = new Certificate(this, "CloudfrontCertificate", {
      domainName: props.fullCloudfrontDomain,
      validation: CertificateValidation.fromDns(props.hostedZone)
    })

    if (useCustomCognitoDomain) {
      this.fullCognitoDomain = `${props.shortCognitoDomain}.${props.hostedZone.zoneName}`

      // - cognito cert
      const cognitoCertificate = new Certificate(this, "CognitoCertificate", {
        domainName: this.fullCognitoDomain,
        validation: CertificateValidation.fromDns(props.hostedZone)
      })

      // we need an DNS A record for custom cognito domain to work
      new ARecord(this, "CognitoARecord", {
        zone: props.hostedZone,
        target: RecordTarget.fromIpAddresses("127.0.0.1"),
        recordName:  `${props.parentCognitoDomain}.${props.hostedZone.zoneName}`
      })

      this.cognitoCertificate = cognitoCertificate
    } else {
      this.fullCognitoDomain = `${props.shortCognitoDomain}.auth.eu-west-2.amazoncognito.com`
    }

    // log groups in US region
    const logGroups = new usRegionLogGroups(this, "usRegionLogGroups", {
      cloudfrontLogGroupName: props.serviceName,
      // waf log groups must start with aws-waf-logs-
      wafLogGroupName: `aws-waf-logs-${props.serviceName}-cloudfront`,
      logRetentionInDays: logRetentionInDays,
      stackName: props.stackName,
      region: this.region,
      account: this.account,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole,
      isPullRequest: isPullRequest,
      csocUSWafDestination: csocUSWafDestination,
      forwardCsocLogs: forwardCsocLogs
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
    this.logDelivery = new CloudfrontLogDelivery(this, "cloudfrontLogDelivery", {
      cloudfrontLogGroup: logGroups.cloudfrontLogGroup,
      cloudfrontDistributionArn: cloudfrontDistributionArn
    })
  }
}
