import {Names} from "aws-cdk-lib"
import {CfnDeliveryDestination, ILogGroup} from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface CloudfrontLogDeliveryProps {
  readonly cloudfrontLogGroup: ILogGroup
  readonly cloudfrontDistributionArn: string
}

export class CloudfrontLogDelivery extends Construct {
  public readonly deliveryDestination: CfnDeliveryDestination

  constructor(scope: Construct, id: string, props: CloudfrontLogDeliveryProps) {
    super(scope, id)
    this.deliveryDestination = new CfnDeliveryDestination(this, "DistributionDeliveryDestination", {
      name: `${Names.uniqueResourceName(this, {maxLength:55})}-dest`,
      destinationResourceArn: props.cloudfrontLogGroup.logGroupArn,
      outputFormat: "json"
    })
  }
}
