import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {Role} from "aws-cdk-lib/aws-iam"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {Key} from "aws-cdk-lib/aws-kms"
import {CfnLogGroup, CfnSubscriptionFilter, LogGroup} from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface RumLogProps {
  readonly rumLogGroupName: string;
  readonly logRetentionInDays: number;

}
export class RumLog extends Construct {
  public readonly logGroup: LogGroup

  constructor(scope: Construct, id: string, props: RumLogProps) {
    super(scope, id)

    // Imports
    // These are imported here rather than at stack level as they are all imports from account-resources stacks
    const cloudWatchLogsKmsKey = Key.fromKeyArn(
      this, "cloudWatchLogsKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))
    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    // Resources
    const rumLogGroup = new LogGroup(this, "RumLogGroup", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/vendedlogs/${props.rumLogGroupName}`,
      retention: props.logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })

    const cfnlambdaLogGroup = rumLogGroup.node.defaultChild as CfnLogGroup
    cfnlambdaLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    new CfnSubscriptionFilter(this, "CoordinatorSplunkSubscriptionFilter", {
      destinationArn: splunkDeliveryStream.streamArn,
      filterPattern: "",
      logGroupName: rumLogGroup.logGroupName,
      roleArn: splunkSubscriptionFilterRole.roleArn
    })

    this.logGroup = rumLogGroup
  }

}
