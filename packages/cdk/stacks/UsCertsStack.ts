import {
  App,
  CfnOutput,
  Duration,
  Environment,
  RemovalPolicy,
  Stack,
  StackProps
} from "aws-cdk-lib"
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"
import {WebACL} from "../resources/WebApplicationFirewall"
import {
CfnLogGroup,
CfnSubscriptionFilter,
LogGroup,
RetentionDays
} from "aws-cdk-lib/aws-logs"
import {
AccountRootPrincipal,
ArnPrincipal,
Effect,
PolicyDocument,
PolicyStatement,
ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Key} from "aws-cdk-lib/aws-kms"

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

    // WAF Web ACL
    const webAcl = new WebACL(this, "WebAclCF", {
      serviceName: props.serviceName,
      rateLimitTransactions: 3000, // 50 TPS
      rateLimitWindowSeconds: 60, // Minimum is 60 seconds
      githubAllowListIpv4: props.githubAllowListIpv4,
      githubAllowListIpv6: props.githubAllowListIpv6,
      wafAllowGaRunnerConnectivity: props.wafAllowGaRunnerConnectivity,
      scope: "CLOUDFRONT"
    })

    // cloudfront log group - needs to be in us-east-1 region
    const cloudWatchLogsKmsKey = new Key(this, "cloudWatchLogsKmsKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-TokensMappingKMSKey`,
      description: `${props.stackName}-TokensMappingKMSKey`,
      enableKeyRotation: true,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: "Enable IAM User Permissions",
            effect: Effect.ALLOW,
            actions: [
              "kms:*"
            ],
            principals: [
              new AccountRootPrincipal
            ],
            resources: ["*"]
          }),
          new PolicyStatement({
            sid: "Allow service logging",
            effect: Effect.ALLOW,
            actions: [
              "kms:Encrypt*",
              "kms:Decrypt*",
              "kms:ReEncrypt*",
              "kms:GenerateDataKey*",
              "kms:Describe*"
            ],
            principals: [
              new ServicePrincipal(`logs.${this.region}.amazonaws.com`)
            ],
            resources: ["*"],
            conditions: {
              "ArnEquals": {
                "kms:EncryptionContext:aws:logs:arn": [
                  `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/cloudfront/*`
                ]
              }
            }
          }),
          new PolicyStatement({
            sid: "Enable deployment role",
            effect: Effect.ALLOW,
            actions: [
              "kms:DescribeKey",
              "kms:GenerateDataKey*",
              "kms:Encrypt",
              "kms:ReEncrypt*"
            ],
            principals: [
              // eslint-disable-next-line max-len
              new ArnPrincipal(`arn:aws:iam::${this.account}:role/cdk-hnb659fds-cfn-exec-role-${this.account}-${this.region}`)
            ],
            resources: ["*"]
          })
        ]
      })
    })

    const cloudfrontLogGroup = new LogGroup(this, "CloudFrontLogGroup", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/cloudfront/${props.stackName}`,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    })

    const cfnCloudfrontLogGroup = cloudfrontLogGroup.node.defaultChild as CfnLogGroup
    cfnCloudfrontLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    const cloudfrontLogGroupPolicy = new PolicyStatement({
      principals: [new ServicePrincipal("delivery.logs.amazonaws.com")],
      actions: [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      resources: [
        cloudfrontLogGroup.logGroupArn,
        `${cloudfrontLogGroup.logGroupArn}:log-stream:*`
      ]
    })

    cloudfrontLogGroup.addToResourcePolicy(cloudfrontLogGroupPolicy)

    new CfnSubscriptionFilter(this, "CloudFrontSplunkSubscriptionFilter", {
      destinationArn: splunkDeliveryStream,
      filterPattern: "",
      logGroupName: cloudfrontLogGroup.logGroupName,
      roleArn: splunkSubscriptionFilterRole
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

    new CfnOutput(this, "CloudFrontLogGroupArn", {
      value: cloudfrontLogGroup.logGroupArn,
      exportName: `${props.stackName}:CloudFrontLogGroup:Arn`
    })

    this.fullCloudfrontDomain = fullCloudfrontDomain
    this.fullCognitoDomain = fullCognitoDomain
  }
}
