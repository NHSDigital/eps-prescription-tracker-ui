import {
  App,
  CfnOutput,
  Environment,
  Stack,
  StackProps
} from "aws-cdk-lib"
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53"
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
  public readonly shortCloudfrontDomain: string
  public readonly fullCloudfrontDomain: string
  public readonly cognitoCertificate: Certificate
  public readonly shortCognitoDomain: string
  public readonly fullCognitoDomain: string

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
    const shortCloudfrontDomain = props.serviceName
    const fullCloudfrontDomain = `${shortCloudfrontDomain}.${epsDomainName}`
    const cloudfrontCertificate = new Certificate(this, "CloudfrontCertificate", {
      domainName: fullCloudfrontDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    /* Resources to add:
      - cognito cert
    */

    const shortCognitoDomain = `auth.login.${props.serviceName}`
    const fullCognitoDomain = `${shortCognitoDomain}.${epsDomainName}`
    const cognitoCertificate = new Certificate(this, "CogniteCertificate", {
      domainName: fullCognitoDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    // we need an DNS A record for custom cognito domain to work
    new ARecord(this, "CognitoARecord", {
      zone: hostedZone,
      target: RecordTarget.fromIpAddresses("127.0.0.1"),
      recordName:  `login.${props.serviceName}.${epsDomainName}`
    })

    // Outputs

    // Exports
    new CfnOutput(this, "CloudfrontCertificateArn", {
      value: cloudfrontCertificate.certificateArn,
      exportName: `${props.stackName}:cloudfrontCertificate:Arn`
    })
    new CfnOutput(this, "shortCloudfrontDomain", {
      value: shortCloudfrontDomain,
      exportName: `${props.stackName}:shortCloudfrontDomain:Name`
    })
    new CfnOutput(this, "fullCloudfrontDomain", {
      value: fullCloudfrontDomain,
      exportName: `${props.stackName}:fullCloudfrontDomain:Name`
    })
    new CfnOutput(this, "shortCognitoDomain", {
      value: shortCognitoDomain,
      exportName: `${props.stackName}:shortCognitoDomain:Name`
    })
    new CfnOutput(this, "fullCognitoDomain", {
      value: fullCognitoDomain,
      exportName: `${props.stackName}:fullCognitoDomain:Name`
    })
    this.shortCloudfrontDomain = shortCloudfrontDomain
    this.fullCloudfrontDomain = fullCloudfrontDomain
    this.cognitoCertificate = cognitoCertificate
    this.shortCognitoDomain = shortCognitoDomain
    this.fullCognitoDomain = fullCognitoDomain
  }
}
