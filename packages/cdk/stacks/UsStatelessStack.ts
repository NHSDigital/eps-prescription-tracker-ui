import {App, Names, Stack} from "aws-cdk-lib"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {StandardStackProps} from "@nhsdigital/eps-cdk-constructs"
import {CfnDelivery, CfnDeliverySource} from "aws-cdk-lib/aws-logs"
import {CloudfrontLogDelivery} from "../resources/CloudfrontLogDelivery"

export interface UsStatelessStackProps extends StandardStackProps {
  readonly cloudfrontLogDelivery: CloudfrontLogDelivery
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
      deliveryDestinationArn: props.cloudfrontLogDelivery.deliveryDestination.attrArn
    })
    delivery.node.addDependency(distDeliverySource)
  }
}
