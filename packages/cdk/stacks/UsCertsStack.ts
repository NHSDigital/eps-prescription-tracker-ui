import {
  App,
  CfnOutput,
  Environment,
  Stack,
  StackProps
} from "aws-cdk-lib"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"

export interface UsCertsStackProps extends StackProps {
  readonly env: Environment
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
}

/**
 * Clinical Prescription Tracker UI US Certs (us-east-1)

 */

export class UsCertsStack extends Stack {
  public readonly cloudfrontCert: Certificate
  public readonly cloudfrontDomain: string
  public readonly cognitoCertificate: Certificate
  public readonly cognitoDomain: string
  public constructor(scope: App, id: string, props: UsCertsStackProps) {
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const epsDomainName: string = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId: string = this.node.tryGetContext("epsHostedZoneId")

    // Imports
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    // Resources
    // - Cloudfront Cert
    const cloudfrontDomain = `${props.serviceName}.${epsDomainName}`
    const cloudfrontCertificate = new Certificate(this, "CloudfrontCertificate", {
      domainName: cloudfrontDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    /* Resources to add:
      - cognito cert
    */

    const cognitoDomain = `auth.${props.serviceName}.${epsDomainName}`
    const cognitoCertificate = new Certificate(this, "CloudfrontCertificate", {
      domainName: cognitoDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    // Outputs

    // Exports
    new CfnOutput(this, "CloudfrontCertificateArn", {
      value: cloudfrontCertificate.certificateArn,
      exportName: `${props.stackName}:cloudfrontCertificate:Arn`
    })
    this.cloudfrontDomain = cloudfrontDomain
    this.cognitoCertificate = cognitoCertificate
    this.cognitoDomain = cognitoDomain
  }
}
