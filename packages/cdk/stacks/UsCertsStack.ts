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
  readonly shortCloudfrontDomain: string
  readonly shortCognitoDomain: string
  readonly parentCognitoDomain: string
}

/**
 * Clinical Prescription Tracker UI US Certs (us-east-1)

 */

export class UsCertsStack extends Stack {
  public readonly cloudfrontCert: Certificate
  public readonly fullCloudfrontDomain: string
  public readonly cognitoCertificate: Certificate
  public readonly fullCognitoDomain: string

  public constructor(scope: App, id: string, props: UsCertsStackProps) {
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const epsDomainName: string = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId: string = this.node.tryGetContext("epsHostedZoneId")
    const useCustomCognitoDomain: boolean = this.node.tryGetContext("useCustomCognitoDomain")

    // Coerce context and imports to relevant types
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    // calculate full domain names
    const fullCloudfrontDomain = `${props.shortCloudfrontDomain}.${epsDomainName}`
    let fullCognitoDomain

    // Resources
    // - Cloudfront Cert
    const cloudfrontCertificate = new Certificate(this, "CloudfrontCertificate", {
      domainName: fullCloudfrontDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    if (useCustomCognitoDomain) {
      fullCognitoDomain = `${props.shortCognitoDomain}.${epsDomainName}`

      // - cognito cert
      const cognitoCertificate = new Certificate(this, "CognitoCertificate", {
        domainName: fullCognitoDomain,
        validation: CertificateValidation.fromDns(hostedZone)
      })

      // we need an DNS A record for custom cognito domain to work
      new ARecord(this, "CognitoARecord", {
        zone: hostedZone,
        target: RecordTarget.fromIpAddresses("127.0.0.1"),
        recordName:  `${props.parentCognitoDomain}.${epsDomainName}`
      })

      this.cognitoCertificate = cognitoCertificate
    } else {
      fullCognitoDomain = `${props.shortCognitoDomain}.auth.eu-west-2.amazoncognito.com`
    }

    // Outputs

    // Exports
    new CfnOutput(this, "CloudfrontCertificateArn", {
      value: cloudfrontCertificate.certificateArn,
      exportName: `${props.stackName}:cloudfrontCertificate:Arn`
    })
    new CfnOutput(this, "shortCloudfrontDomain", {
      value: props.shortCloudfrontDomain,
      exportName: `${props.stackName}:shortCloudfrontDomain:Name`
    })
    new CfnOutput(this, "fullCloudfrontDomain", {
      value: fullCloudfrontDomain,
      exportName: `${props.stackName}:fullCloudfrontDomain:Name`
    })

    new CfnOutput(this, "shortCognitoDomain", {
      value: props.shortCognitoDomain,
      exportName: `${props.stackName}:shortCognitoDomain:Name`
    })
    new CfnOutput(this, "fullCognitoDomain", {
      value: fullCognitoDomain,
      exportName: `${props.stackName}:fullCognitoDomain:Name`
    })

    this.fullCloudfrontDomain = fullCloudfrontDomain
    this.fullCognitoDomain = fullCognitoDomain
  }
}
