import * as cdk from "aws-cdk-lib"

import {Apis} from "../resources/apis"
import {Cognito} from "../resources/cognito"
import {Dynamodb} from "../resources/dynamodb"
import {Functions} from "../resources/lambdas"

/**
 * Clinical Prescription Tracker UI

 */

export interface ClinicalPrescriptionTrackerStackProps extends cdk.StackProps {
  readonly userPoolTLSCertificateArn: string;
}
export class ClinicalPrescriptionTrackerStack extends cdk.Stack {
  /**
   * ID of the created primary Cognito User Pool
   */
  public readonly primaryUserPoolId
  /**
   * ID of the created primary Cognito User Pool client
   */
  public readonly primaryUserPoolClientId
  /**
   * ID of the created primary Cognito User Pool client
   */
  public readonly hostedLoginDomain

  public constructor(scope: cdk.App, id: string, props: ClinicalPrescriptionTrackerStackProps ) {
    super(scope, id, props)

    const primaryOidcClientId = new cdk.CfnParameter(this, "primaryOidcClientId", {
      description: "primaryOidcClientId",
      type: "String"
    }).valueAsString
    const primaryOidClientSecret = new cdk.CfnParameter(this, "primaryOidClientSecret", {
      description: "primaryOidClientSecret",
      type: "String"
    }).valueAsString
    const primaryOidcIssuer = new cdk.CfnParameter(this, "primaryOidcIssuer", {
      description: "primaryOidcIssuer",
      type: "String"
    }).valueAsString
    const primaryOidcAuthorizeEndpoint = new cdk.CfnParameter(this, "primaryOidcAuthorizeEndpoint", {
      description: "primaryOidcAuthorizeEndpoint",
      type: "String"
    }).valueAsString
    const primaryOidcTokenEndpoint = new cdk.CfnParameter(this, "primaryOidcTokenEndpoint", {
      description: "primaryOidcTokenEndpoint",
      type: "String"
    }).valueAsString
    const primaryOidcUserInfoEndpoint = new cdk.CfnParameter(this, "primaryOidcUserInfoEndpoint", {
      description: "primaryOidcUserInfoEndpoint",
      type: "String"
    }).valueAsString
    const primaryOidcjwksEndpoint = new cdk.CfnParameter(this, "primaryOidcjwksEndpoint", {
      description: "primaryOidcjwksEndpoint",
      type: "String"
    }).valueAsString

    // parameters passed to other stack but needed here for full deployment to work
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const epsDomain = new cdk.CfnParameter(this, "epsDomain", {
      description: "epsDomain",
      type: "String"
    }).valueAsString
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const epsZoneId = new cdk.CfnParameter(this, "epsZoneId", {
      description: "epsZoneId",
      type: "String"
    }).valueAsString

    // Resources
    const tables = new Dynamodb(this, "Tables", {
      stackName: this.stackName,
      account: this.account,
      region: this.region
    })

    const cognito = new Cognito(this, "Cognito", {
      stackName: this.stackName,
      primaryOidcClientId: primaryOidcClientId!,
      primaryOidClientSecret: primaryOidClientSecret!,
      primaryOidcIssuer: primaryOidcIssuer!,
      primaryOidcAuthorizeEndpoint: primaryOidcAuthorizeEndpoint!,
      primaryOidcTokenEndpoint: primaryOidcTokenEndpoint!,
      primaryOidcUserInfoEndpoint: primaryOidcUserInfoEndpoint!,
      primaryOidcjwksEndpoint: primaryOidcjwksEndpoint!,
      tokenMappingTableName: tables.tokenMappingTableName,
      userPoolTlsCertificateArn: props.userPoolTLSCertificateArn,
      region: this.region,
      account: this.account,
      tokenMappingTableWritePolicyArn: tables.tokenMappingTableWritePolicyArn,
      tokenMappingTableReadPolicyArn: tables.tokenMappingTableReadPolicyArn,
      useTokensMappingKMSKeyPolicyArn: tables.useTokensMappingKmsKeyPolicyArn
    })

    const functions = new Functions(this, "Functions", {
      stackName: this.stackName,
      versionNumber: "foo",
      commitId: "bar",
      tokenMappingTableName: tables.tokenMappingTableName,
      region: this.region,
      account: this.account,
      tokenMappingTableWritePolicyArn: tables.tokenMappingTableWritePolicyArn,
      tokenMappingTableReadPolicyArn: tables.tokenMappingTableReadPolicyArn,
      useTokensMappingKMSKeyPolicyArn: tables.useTokensMappingKmsKeyPolicyArn
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apis = new Apis(this, "Apis", {
      stackName: this.stackName,
      statusFunctionName: functions.statusFunctionName,
      statusFunctionArn: functions.statusFunctionArn.toString(),
      userPoolArn: cognito.userPoolArn,
      region: this.region,
      executeStatusLambdaPolicyArn: functions.executeStatusLambdaPolicyArn
    })

    // Outputs
    this.primaryUserPoolId = cognito.userPoolId
    new cdk.CfnOutput(this, "CfnOutputPrimaryUserPoolId", {
      key: "PrimaryUserPoolId",
      description: "ID of the created primary Cognito User Pool",
      exportName: `${this.stackName}:Cognito:PrimaryUserPoolId`,
      value: this.primaryUserPoolId!.toString()
    })
    this.primaryUserPoolClientId = cognito.userPoolClientId
    new cdk.CfnOutput(this, "CfnOutputPrimaryUserPoolClientId", {
      key: "PrimaryUserPoolClientId",
      description: "ID of the created primary Cognito User Pool client",
      exportName: `${this.stackName}:Cognito:PrimaryUserPoolClientId`,
      value: this.primaryUserPoolClientId!.toString()
    })
    this.hostedLoginDomain = cognito.hostedLoginDomain
    new cdk.CfnOutput(this, "CfnOutputHostedLoginDomain", {
      key: "HostedLoginDomain",
      description: "ID of the created primary Cognito User Pool client",
      exportName: `${this.stackName}:Cognito:HostedLoginDomain`,
      value: this.hostedLoginDomain!.toString()
    })
  }
}
