import {Duration, RemovalPolicy} from "aws-cdk-lib"
import {
  AccountRootPrincipal,
  ArnPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Key} from "aws-cdk-lib/aws-kms"
import {
CfnLogGroup,
CfnResourcePolicy,
CfnSubscriptionFilter,
LogGroup
} from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface usRegionLogGroupsProps {
  readonly cloudfrontLogGroupName: string
  readonly wafLogGroupName: string
  readonly logRetentionInDays: number
  readonly stackName: string
  readonly region: string
  readonly account: string
  readonly splunkDeliveryStream: string
  readonly splunkSubscriptionFilterRole: string
}

export class usRegionLogGroups extends Construct {
  public readonly cloudfrontLogGroup: LogGroup
  public readonly wafLogGroup: LogGroup

  constructor(scope: Construct, id: string, props: usRegionLogGroupsProps) {
    super(scope, id)

    const cloudwatchLogsKmsKey = new Key(this, "cloudWatchLogsKmsKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-cloudwatchLogKMSKey`,
      description: `${props.stackName}-cloudwathLogKMSKey`,
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
              new ServicePrincipal(`logs.${props.region}.amazonaws.com`)
            ],
            resources: ["*"],
            conditions: {
              "ArnEquals": {
                "kms:EncryptionContext:aws:logs:arn": [
                  `arn:aws:logs:${props.region}:${props.account}:log-group:/aws/cloudfront/*`,
                  `arn:aws:logs:${props.region}:${props.account}:log-group:aws-waf-logs-*`
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
              new ArnPrincipal(`arn:aws:iam::${props.account}:role/cdk-hnb659fds-cfn-exec-role-${props.account}-${props.region}`)
            ],
            resources: ["*"]
          })
        ]
      })
    })

    const cloudfrontLogGroup = new LogGroup(this, "CloudFrontLogGroup", {
      encryptionKey: cloudwatchLogsKmsKey,
      logGroupName: `/aws/cloudfront/${props.cloudfrontLogGroupName}`,
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

    new CfnSubscriptionFilter(this, "CloudfrontSplunkSubscriptionFilter", {
      destinationArn: props.splunkDeliveryStream,
      filterPattern: "",
      logGroupName: cloudfrontLogGroup.logGroupName,
      roleArn: props.splunkSubscriptionFilterRole
    })

    const wafLogGroup = new LogGroup(this, "WafLogGroup", {
      encryptionKey: cloudwatchLogsKmsKey,
      logGroupName: `${props.wafLogGroupName}`,
      retention: props.logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })

    const cfnWafLogGroup = wafLogGroup.node.defaultChild as CfnLogGroup
    cfnWafLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    new CfnSubscriptionFilter(this, "WafSplunkSubscriptionFilter", {
      destinationArn: props.splunkDeliveryStream,
      filterPattern: "",
      logGroupName: wafLogGroup.logGroupName,
      roleArn: props.splunkSubscriptionFilterRole
    })

    // create a service policy here so we can specify a name and avoid clashes
    const serviceLogPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {Service: "delivery.logs.amazonaws.com"},
            Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
            Resource: [
              cloudfrontLogGroup.logGroupArn,
              `${cloudfrontLogGroup.logGroupArn}:log-stream:*`,
              wafLogGroup.logGroupArn,
              `${wafLogGroup.logGroupArn}:log-stream:*`
            ]
          }
        ]
      }
    new CfnResourcePolicy(this, "CloudFrontResourcePolicy", {
      policyName: `${props.stackName}LogServicePolicy`,
      policyDocument: JSON.stringify(serviceLogPolicy)
    })

    this.cloudfrontLogGroup = cloudfrontLogGroup
    this.wafLogGroup = wafLogGroup
  }

}
