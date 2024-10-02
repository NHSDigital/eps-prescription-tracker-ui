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

    const primaryOidcClientId = this.node.tryGetContext("primaryOidcClientId")
    const primaryOidClientSecret = this.node.tryGetContext("primaryOidClientSecret")
    const primaryOidcIssuer = this.node.tryGetContext("primaryOidcIssuer")
    const primaryOidcAuthorizeEndpoint = this.node.tryGetContext("primaryOidcAuthorizeEndpoint")
    const primaryOidcTokenEndpoint = this.node.tryGetContext("primaryOidcTokenEndpoint")
    const primaryOidcUserInfoEndpoint = this.node.tryGetContext("primaryOidcUserInfoEndpoint")
    const primaryOidcjwksEndpoint = this.node.tryGetContext("primaryOidcjwksEndpoint")

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
      tokenMappingTable: tables.tokenMappingTable,
      userPoolTlsCertificateArn: props.userPoolTLSCertificateArn,
      region: this.region,
      account: this.account,
      tokenMappingTableWritePolicy: tables.tokenMappingTableWritePolicy,
      tokenMappingTableReadPolicy: tables.tokenMappingTableReadPolicy,
      useTokensMappingKMSKeyPolicy: tables.useTokensMappingKmsKeyPolicy
    })

    const functions = new Functions(this, "Functions", {
      stackName: this.stackName,
      versionNumber: "foo",
      commitId: "bar",
      tokenMappingTable: tables.tokenMappingTable,
      tokenMappingTableWritePolicy: tables.tokenMappingTableWritePolicy,
      tokenMappingTableReadPolicy: tables.tokenMappingTableReadPolicy,
      useTokensMappingKMSKeyPolicy: tables.useTokensMappingKmsKeyPolicy
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apis = new Apis(this, "Apis", {
      stackName: this.stackName,
      statusLambda: functions.statusLambda,
      userPool: cognito.userPool,
      region: this.region,
      executeStatusLambdaPolicy: functions.executeStatusLambdaPolicy
    })

    // Outputs
    this.primaryUserPoolId = cognito.userPool.userPoolId
    new cdk.CfnOutput(this, "CfnOutputPrimaryUserPoolId", {
      key: "PrimaryUserPoolId",
      description: "ID of the created primary Cognito User Pool",
      exportName: `${this.stackName}:Cognito:PrimaryUserPoolId`,
      value: this.primaryUserPoolId!.toString()
    })
    this.primaryUserPoolClientId = cognito.userPoolClient.userPoolClientId
    new cdk.CfnOutput(this, "CfnOutputPrimaryUserPoolClientId", {
      key: "PrimaryUserPoolClientId",
      description: "ID of the created primary Cognito User Pool client",
      exportName: `${this.stackName}:Cognito:PrimaryUserPoolClientId`,
      value: this.primaryUserPoolClientId!.toString()
    })
    this.hostedLoginDomain = cognito.userPoolDomain.domainName
    new cdk.CfnOutput(this, "CfnOutputHostedLoginDomain", {
      key: "HostedLoginDomain",
      description: "ID of the created primary Cognito User Pool client",
      exportName: `${this.stackName}:Cognito:HostedLoginDomain`,
      value: this.hostedLoginDomain!.toString()
    })
  }
}
