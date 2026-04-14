import {App, Names, Stack} from "aws-cdk-lib"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {StandardStackProps} from "@nhsdigital/eps-cdk-constructs"
import {CfnDelivery, CfnDeliveryDestination, CfnDeliverySource} from "aws-cdk-lib/aws-logs"

export interface UsStatelessStackProps extends StandardStackProps {
  readonly deliveryDestination: CfnDeliveryDestination
  readonly cloudfrontDistribution: CloudfrontDistribution
}

/**
 * Clinical Prescription Tracker UI US Stateless Resources (us-east-1)
 */

export class UsStatelessStack extends Stack {
  constructor(scope: App, id: string, props: UsStatelessStackProps) {
    super(scope, id, props)

    const distDeliverySource = new CfnDeliverySource(this, "DistributionDeliverySource", {
      name: `${Names.uniqueResourceName(this, {maxLength:55})}-src`,
      logType: "ACCESS_LOGS",
      resourceArn: props.cloudfrontDistribution.distribution.distributionArn
    })

    const delivery = new CfnDelivery(this, "DistributionDelivery", {
      deliverySourceName: distDeliverySource.name,
      deliveryDestinationArn: props.deliveryDestination.attrArn
    })
    delivery.node.addDependency(distDeliverySource)
  }
}
