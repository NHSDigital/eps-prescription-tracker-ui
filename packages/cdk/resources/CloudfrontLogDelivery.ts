import {Names} from "aws-cdk-lib"
import {
  CfnDelivery,
  CfnDeliveryDestination,
  CfnDeliverySource,
  ILogGroup,
  LogGroup
} from "aws-cdk-lib/aws-logs"
import {Construct} from "constructs"

export interface CloudfrontLogDeliveryProps {
  readonly cloudfrontLogGroup: ILogGroup
  readonly cloudfrontDistributionArn: string
}

export class CloudfrontLogDelivery extends Construct {
  public readonly logGroup: LogGroup

  constructor(scope: Construct, id: string, props: CloudfrontLogDeliveryProps) {
    super(scope, id)
    const distDeliveryDestination = new CfnDeliveryDestination(this, "DistributionDeliveryDestination", {
      name: `${Names.uniqueResourceName(this, {maxLength:55})}-dest`,
      destinationResourceArn: props.cloudfrontLogGroup.logGroupArn,
      outputFormat: "json"
    })

    // add the delivery source and delivery for cloudfront logs
    // this can only be done once the cloudfront distribution is created in the stateless stack
    if (props.cloudfrontDistributionArn) {
      const distDeliverySource = new CfnDeliverySource(this, "DistributionDeliverySource", {
        name: `${Names.uniqueResourceName(this, {maxLength:55})}-src`,
        logType: "ACCESS_LOGS",
        resourceArn: props.cloudfrontDistributionArn
      })

      const delivery = new CfnDelivery(this, "DistributionDelivery", {
        deliverySourceName: distDeliverySource.name,
        deliveryDestinationArn: distDeliveryDestination.attrArn
      })
      delivery.node.addDependency(distDeliverySource)

    }
  }

}
