import {RemovalPolicy} from "aws-cdk-lib"
import {IRole, PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam"
import {IStream} from "aws-cdk-lib/aws-kinesis"
import {IKey} from "aws-cdk-lib/aws-kms"
import {CfnLogGroup, CfnSubscriptionFilter, LogGroup} from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface ukRegionLogGroupsProps {
  readonly cloudwatchKmsKey: IKey
  readonly logRetentionInDays: number
  readonly splunkDeliveryStream: IStream
  readonly splunkSubscriptionFilterRole: IRole
  readonly wafLogGroupName: string
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

    const wafLogGroupPolicy = new PolicyStatement({
      principals: [new ServicePrincipal("delivery.logs.amazonaws.com")],
      actions: [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      resources: [
        wafLogGroup.logGroupArn,
        `${wafLogGroup.logGroupArn}:log-stream:*`
      ]
    })

    wafLogGroup.addToResourcePolicy(wafLogGroupPolicy)

    new CfnSubscriptionFilter(this, "WafSplunkSubscriptionFilter", {
      destinationArn: props.splunkDeliveryStream.streamArn,
      filterPattern: "",
      logGroupName: wafLogGroup.logGroupName,
      roleArn: props.splunkSubscriptionFilterRole.roleArn
    })

    this.wafLogGroup = wafLogGroup
  }

}
