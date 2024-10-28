import {
  App,
  Environment,
  Stack,
  StackProps
} from "aws-cdk-lib"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"

export interface CloudfrontStackProps extends StackProps {
  readonly env: Environment
  readonly stackName: string
  readonly version: string
  readonly epsDomainName: string
  readonly epsHostedZoneId: string
}

/**
 * Clinical Prescription Tracker UI Cloudfront

 */

export class CloudfrontStackjustUS extends Stack {
  public readonly cert: Certificate
  public constructor(scope: App, id: string, props: CloudfrontStackProps) {
    super(scope, id, props)

    // Imports
    // const epsHostedZoneId = Fn.importValue("eps-route53-resources:EPS-ZoneID")
    // const epsDomainName = Fn.importValue("eps-route53-resources:EPS-domain")

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: props.epsHostedZoneId,
      zoneName: props.epsDomainName
    })

    // Cert
    const cloudfrontCertificate = new Certificate(this, "CloudfrontCertificate", {
      domainName: props.epsDomainName,
      validation: CertificateValidation.fromDns(hostedZone)
    })
    this.cert = cloudfrontCertificate
  }
}
