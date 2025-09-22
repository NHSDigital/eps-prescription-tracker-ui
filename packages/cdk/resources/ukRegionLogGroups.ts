import {RemovalPolicy} from "aws-cdk-lib"
import {IRole} from "aws-cdk-lib/aws-iam"
import {IStream} from "aws-cdk-lib/aws-kinesis"
import {IKey} from "aws-cdk-lib/aws-kms"
import {
  CfnLogGroup,
  CfnResourcePolicy,
  CfnSubscriptionFilter,
  LogGroup
} from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface ukRegionLogGroupsProps {
  readonly cloudwatchKmsKey: IKey
  readonly logRetentionInDays: number
  readonly splunkDeliveryStream: IStream
  readonly splunkSubscriptionFilterRole: IRole
  readonly wafLogGroupName: string
  readonly stackName: string
  readonly isPullRequest: boolean
}

export class ukRegionLogGroups extends Construct {
  public readonly wafLogGroup: LogGroup

  constructor(scope: Construct, id: string, props: ukRegionLogGroupsProps) {
    super(scope, id)

    const wafLogGroup = new LogGroup(this, "wafLogGroup", {
      encryptionKey: props.cloudwatchKmsKey,
      logGroupName: props.wafLogGroupName,
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

    const serviceLogPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {Service: "delivery.logs.amazonaws.com"},
          Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
          Resource: [
            wafLogGroup.logGroupArn,
            `${wafLogGroup.logGroupArn}:log-stream:*`
          ]
        }
      ]
    }
    // Don't deploy to PR stacks as there is a limit of 10 resource policies per region
    if (!props.isPullRequest) {
      new CfnResourcePolicy(this, "CloudFrontResourcePolicy", {
        policyName: `${props.stackName}LogServicePolicy`,
        policyDocument: JSON.stringify(serviceLogPolicy)
      })
    }
    new CfnSubscriptionFilter(this, "WafSplunkSubscriptionFilter", {
      destinationArn: props.splunkDeliveryStream.streamArn,
      filterPattern: "",
      logGroupName: wafLogGroup.logGroupName,
      roleArn: props.splunkSubscriptionFilterRole.roleArn
    })

    this.wafLogGroup = wafLogGroup
  }

}
