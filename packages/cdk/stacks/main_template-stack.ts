/* eslint-disable @typescript-eslint/no-unused-vars */
import * as cdk from "aws-cdk-lib"

import {Apis} from "./apis"
import {Cognito} from "./cognito"
import {Dynamodb} from "./dynamodb"
import {Functions} from "./functions"

export interface MainTemplateStackProps extends cdk.StackProps {
  /**
   */
  readonly primaryOidcClientId: string;
  /**
   */
  readonly primaryOidClientSecret: string;
  /**
   */
  readonly primaryOidcIssuer: string;
  /**
   */
  readonly primaryOidcAuthorizeEndpoint: string;
  /**
   */
  readonly primaryOidcTokenEndpoint: string;
  /**
   */
  readonly primaryOidcUserInfoEndpoint: string;
  /**
   */
  readonly primaryOidcjwksEndpoint: string;
  /**
   */
  readonly userPoolTlsCertificateArn: string;
}

/**
 * Clinical Prescription Tracker UI

 */
export class MainTemplateStack extends cdk.Stack {
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

  public constructor(scope: cdk.App, id: string, props: MainTemplateStackProps) {
    super(scope, id, props)

    // Transforms
    this.addTransform("AWS::Serverless-2016-10-31")

    // Resources
    const tables = new Dynamodb(this, "Tables", {
      stackName: this.stackName,
      account: this.account,
      region: this.region
    })

    const cognito = new Cognito(this, "Cognito", {
      stackName: this.stackName,
      primaryOidcClientId: props.primaryOidcClientId!,
      primaryOidClientSecret: props.primaryOidClientSecret!,
      primaryOidcIssuer: props.primaryOidcIssuer!,
      primaryOidcAuthorizeEndpoint: props.primaryOidcAuthorizeEndpoint!,
      primaryOidcTokenEndpoint: props.primaryOidcTokenEndpoint!,
      primaryOidcUserInfoEndpoint: props.primaryOidcUserInfoEndpoint!,
      primaryOidcjwksEndpoint: props.primaryOidcjwksEndpoint!,
      tokenMappingTableName: tables.tokenMappingTableName,
      userPoolTlsCertificateArn: props.userPoolTlsCertificateArn!,
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
