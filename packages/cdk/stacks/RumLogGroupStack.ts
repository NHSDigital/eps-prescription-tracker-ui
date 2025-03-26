import {
  App,
  CfnOutput,
  Environment,
  Fn,
  RemovalPolicy,
  Stack,
  StackProps
} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {Role} from "aws-cdk-lib/aws-iam"
import {CfnLogGroup, CfnSubscriptionFilter, LogGroup} from "aws-cdk-lib/aws-logs"

export interface RumLogGroupStackProps extends StackProps {
  readonly env: Environment
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
}

/**
 * Clinical Prescription Tracker UI Rum log group

 */

export class RumLogGroupStack extends Stack {
  public constructor(scope: App, id: string, props: RumLogGroupStackProps) {
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const rumLogGroupName: string = this.node.tryGetContext("rumLogGroupName")
    const logRetentionInDays: number = Number(this.node.tryGetContext("logRetentionInDays"))

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
      logGroupName: `/aws/vendedlogs/${rumLogGroupName}`,
      retention: logRetentionInDays,
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

    // Outputs

    // Exports
    new CfnOutput(this, "rumLogGroupArn", {
      value: rumLogGroup.logGroupArn,
      exportName: `${props.stackName}:rum:logGroup:arn`
    })

  }
}
