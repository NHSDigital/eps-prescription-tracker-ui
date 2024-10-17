import * as cdk from "aws-cdk-lib"
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager"

/**
 * AWS Certificates for deployment in us-east-1
 */
export class USCertificatesStack extends cdk.Stack {
  /**
   * arn of the user pool TLS certificate
   */
  public readonly userPoolTlsCertificateArn

  public constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    const epsDomain = this.node.tryGetContext("epsDomain")
    const epsZoneId = this.node.tryGetContext("epsZoneId")

    // Resources

    const targetDomainName = `id.${this.stackName}.${epsDomain}`
    const userPoolTlsCertificate = new certificatemanager.CfnCertificate(this, "UserPoolTLSCertificate", {
      validationMethod: "DNS",
      domainName: targetDomainName,
      domainValidationOptions: [
        {
          domainName: targetDomainName,
          hostedZoneId: epsZoneId!
        }
      ]
    })

    // Outputs
    this.userPoolTlsCertificateArn = userPoolTlsCertificate.ref
  }
}
