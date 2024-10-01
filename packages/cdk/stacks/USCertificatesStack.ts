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

    const epsDomain = new cdk.CfnParameter(this, "epsDomain", {
      description: "epsDomain",
      type: "String"
    }).valueAsString
    const epsZoneId = new cdk.CfnParameter(this, "epsZoneId", {
      description: "epsZoneId",
      type: "String"
    }).valueAsString

    // parameters passed to other stack but needed here for full deployment to work
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const primaryOidcClientId = new cdk.CfnParameter(this, "primaryOidcClientId", {
      description: "primaryOidcClientId",
      type: "String"
    }).valueAsString
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const primaryOidClientSecret = new cdk.CfnParameter(this, "primaryOidClientSecret", {
      description: "primaryOidClientSecret",
      type: "String"
    }).valueAsString
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const primaryOidcIssuer = new cdk.CfnParameter(this, "primaryOidcIssuer", {
      description: "primaryOidcIssuer",
      type: "String"
    }).valueAsString
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const primaryOidcAuthorizeEndpoint = new cdk.CfnParameter(this, "primaryOidcAuthorizeEndpoint", {
      description: "primaryOidcAuthorizeEndpoint",
      type: "String"
    }).valueAsString
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const primaryOidcTokenEndpoint = new cdk.CfnParameter(this, "primaryOidcTokenEndpoint", {
      description: "primaryOidcTokenEndpoint",
      type: "String"
    }).valueAsString
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const primaryOidcUserInfoEndpoint = new cdk.CfnParameter(this, "primaryOidcUserInfoEndpoint", {
      description: "primaryOidcUserInfoEndpoint",
      type: "String"
    }).valueAsString
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const primaryOidcjwksEndpoint = new cdk.CfnParameter(this, "primaryOidcjwksEndpoint", {
      description: "primaryOidcjwksEndpoint",
      type: "String"
    }).valueAsString

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