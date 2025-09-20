import {
  App,
  ArnFormat,
  CfnOutput,
  Environment,
  Stack,
  StackProps
} from "aws-cdk-lib"
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"
import {WebACL} from "../resources/WebApplicationFirewall"
import {CloudfrontLogDelivery} from "../resources/CloudfrontLogDelivery"
import {usRegionLogGroups} from "../resources/usRegionLogGroups"

export interface UsCertsStackProps extends StackProps {
  readonly env: Environment
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
  readonly shortCloudfrontDomain: string
  readonly shortCognitoDomain: string
  readonly parentCognitoDomain: string
  readonly githubAllowListIpv4: Array<string>
  readonly githubAllowListIpv6: Array<string>
  readonly wafAllowGaRunnerConnectivity: boolean
}

/**
 * Clinical Prescription Tracker UI US Certs (us-east-1)

 */

export class UsCertsStack extends Stack {
  public readonly cloudfrontCert: Certificate
  public readonly fullCloudfrontDomain: string
  public readonly cognitoCertificate: Certificate
  public readonly fullCognitoDomain: string
  public readonly webAcl: WebACL

  public constructor(scope: App, id: string, props: UsCertsStackProps) {
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const epsDomainName: string = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId: string = this.node.tryGetContext("epsHostedZoneId")
    const useCustomCognitoDomain: boolean = this.node.tryGetContext("useCustomCognitoDomain")
    const useZoneApex: boolean = this.node.tryGetContext("useZoneApex")
    const splunkDeliveryStream: string = this.node.tryGetContext("splunkDeliveryStream")
    const splunkSubscriptionFilterRole: string = this.node.tryGetContext("splunkSubscriptionFilterRole")
    const cloudfrontDistributionArn: string = this.node.tryGetContext("cloudfrontDistributionArn")
    const logRetentionInDays: number = Number(this.node.tryGetContext("logRetentionInDays"))
    const isPullRequest: boolean = this.node.tryGetContext("isPullRequest")

    // Coerce context and imports to relevant types
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    // calculate full domain names
    let fullCloudfrontDomain
    if (useZoneApex) {
      fullCloudfrontDomain = epsDomainName
    } else {
      fullCloudfrontDomain = `${props.shortCloudfrontDomain}.${epsDomainName}`

    }
    let fullCognitoDomain

    // Resources
    // - Cloudfront Cert
    const cloudfrontCertificate = new Certificate(this, "CloudfrontCertificate", {
      domainName: fullCloudfrontDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    if (useCustomCognitoDomain) {
      fullCognitoDomain = `${props.shortCognitoDomain}.${epsDomainName}`

      // - cognito cert
      const cognitoCertificate = new Certificate(this, "CognitoCertificate", {
        domainName: fullCognitoDomain,
        validation: CertificateValidation.fromDns(hostedZone)
      })

      // we need an DNS A record for custom cognito domain to work
      new ARecord(this, "CognitoARecord", {
        zone: hostedZone,
        target: RecordTarget.fromIpAddresses("127.0.0.1"),
        recordName:  `${props.parentCognitoDomain}.${epsDomainName}`
      })

      this.cognitoCertificate = cognitoCertificate
    } else {
      fullCognitoDomain = `${props.shortCognitoDomain}.auth.eu-west-2.amazoncognito.com`
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
      isPullRequest: isPullRequest
    })

    // WAF Web ACL
    const webAcl = new WebACL(this, "WebAclCF", {
      serviceName: props.serviceName,
      rateLimitTransactions: 3000, // 50 TPS
      rateLimitWindowSeconds: 60, // Minimum is 60 seconds
      githubAllowListIpv4: props.githubAllowListIpv4,
      githubAllowListIpv6: props.githubAllowListIpv6,
      wafAllowGaRunnerConnectivity: props.wafAllowGaRunnerConnectivity,
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
    new CloudfrontLogDelivery(this, "cloudfrontLogDelivery", {
      cloudfrontLogGroup: logGroups.cloudfrontLogGroup,
      cloudfrontDistributionArn: cloudfrontDistributionArn
    })

    // Outputs

    // Exports
    new CfnOutput(this, "webAclAttrArn", {
      value: webAcl.webAcl.attrArn,
      exportName: `${props.stackName}:webAcl:attrArn`
    })
    new CfnOutput(this, "CloudfrontCertificateArn", {
      value: cloudfrontCertificate.certificateArn,
      exportName: `${props.stackName}:cloudfrontCertificate:Arn`
    })
    new CfnOutput(this, "shortCloudfrontDomain", {
      value: props.shortCloudfrontDomain,
      exportName: `${props.stackName}:shortCloudfrontDomain:Name`
    })
    new CfnOutput(this, "fullCloudfrontDomain", {
      value: fullCloudfrontDomain,
      exportName: `${props.stackName}:fullCloudfrontDomain:Name`
    })

    new CfnOutput(this, "shortCognitoDomain", {
      value: props.shortCognitoDomain,
      exportName: `${props.stackName}:shortCognitoDomain:Name`
    })
    new CfnOutput(this, "fullCognitoDomain", {
      value: fullCognitoDomain,
      exportName: `${props.stackName}:fullCognitoDomain:Name`
    })

    this.fullCloudfrontDomain = fullCloudfrontDomain
    this.fullCognitoDomain = fullCognitoDomain
  }
}
