import {Fn, Names, RemovalPolicy} from "aws-cdk-lib"
import {ICertificate} from "aws-cdk-lib/aws-certificatemanager"
import {
  BehaviorOptions,
  Distribution,
  ErrorResponse,
  HttpVersion,
  SecurityPolicyProtocol,
  SSLMethod
} from "aws-cdk-lib/aws-cloudfront"
import {PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {Key} from "aws-cdk-lib/aws-kms"
import {
  CfnDelivery,
  CfnDeliveryDestination,
CfnDeliverySource,
CfnLogGroup,
CfnSubscriptionFilter,
LogGroup
} from "aws-cdk-lib/aws-logs"
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
  readonly logRetentionInDays: number
}

/**
 * Resources for a Cloudfront Distribution

 */

export class CloudfrontDistribution extends Construct {
  public readonly distribution

  public constructor(scope: Construct, id: string, props: CloudfrontDistributionProps){
    super(scope, id)

    // Imports
    const cloudWatchLogsKmsKey = Key.fromKeyArn(
      this, "cloudWatchLogsKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))

    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

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

    // send logs to cloudwatch
    const cloudfrontLogGroup = new LogGroup(this, "CloudFrontLogGroup", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/cloudfront/${props.stackName}`,
      retention: props.logRetentionInDays,
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

    new CfnSubscriptionFilter(this, "CoordinatorSplunkSubscriptionFilter", {
      destinationArn: splunkDeliveryStream.streamArn,
      filterPattern: "",
      logGroupName: cloudfrontLogGroup.logGroupName,
      roleArn: splunkSubscriptionFilterRole.roleArn
    })

    const distDeliverySource = new CfnDeliverySource(this, "DistributionDeliverySource", {
        name: `${Names.uniqueResourceName(this, {maxLength:55})}-src`,
        logType: "ACCESS_LOGS",
        resourceArn: cloudfrontDistribution.distributionArn
    })

    const distDeliveryDestination = new CfnDeliveryDestination(this, "DistributionDeliveryDestination", {
      name: `${Names.uniqueResourceName(this, {maxLength:55})}-dest`,
      destinationResourceArn: cloudfrontLogGroup.logGroupArn,
      outputFormat: "json"
    })

    const delivery = new CfnDelivery(this, "DistributionDelivery", {
        deliverySourceName: distDeliverySource.name,
        deliveryDestinationArn: distDeliveryDestination.attrArn
    })
    delivery.node.addDependency(distDeliverySource)
    delivery.node.addDependency(distDeliveryDestination)

    // Outputs
    this.distribution = cloudfrontDistribution
  }
}
