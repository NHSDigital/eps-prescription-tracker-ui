import {App, Fn, Stack} from "aws-cdk-lib"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {StandardStackProps} from "@nhsdigital/eps-cdk-constructs"
import {
  AaaaRecord,
  ARecord,
  HostedZone,
  RecordTarget
} from "aws-cdk-lib/aws-route53"
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets"

export interface FrontDoorStackProps extends StandardStackProps {
  readonly serviceName: string
  readonly route53ExportName: string
  readonly useZoneApex: boolean
  readonly cloudfrontDistribution: CloudfrontDistribution
}

/**
 * Clinical Prescription Tracker UI Front Door Stack
 */

export class FrontDoorStack extends Stack {
  constructor(scope: App, id: string, props: FrontDoorStackProps) {
    super(scope, id, props)

    const epsHostedZoneId = Fn.importValue(`eps-route53-resources:${props.route53ExportName}-ZoneID`)
    const epsDomainName = Fn.importValue(`eps-route53-resources:${props.route53ExportName}-domain`)
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    if (props.useZoneApex) {
      new ARecord(this, "CloudFrontAliasIpv4Record", {
        zone: hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(props.cloudfrontDistribution.distribution))})

      new AaaaRecord(this, "CloudFrontAliasIpv6Record", {
        zone: hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(props.cloudfrontDistribution.distribution))})
    } else {
      new ARecord(this, "CloudFrontAliasIpv4Record", {
        zone: hostedZone,
        recordName: props.serviceName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(props.cloudfrontDistribution.distribution))})

      new AaaaRecord(this, "CloudFrontAliasIpv6Record", {
        zone: hostedZone,
        recordName: props.serviceName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(props.cloudfrontDistribution.distribution))})
    }
  }
}
