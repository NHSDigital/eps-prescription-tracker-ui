import * as cdk from 'aws-cdk-lib';
import * as sam from 'aws-cdk-lib/aws-sam';

import { ApisStack } from './apis-stack';
import { CognitoStack } from './cognito-stack';
import { DynamodbStack } from './dynamodb-stack';
import { FunctionsStack } from './functions-stack';

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
  public readonly primaryUserPoolId;
  /**
   * ID of the created primary Cognito User Pool client
   */
  public readonly primaryUserPoolClientId;
  /**
   * ID of the created primary Cognito User Pool client
   */
  public readonly hostedLoginDomain;

  public constructor(scope: cdk.App, id: string, props: MainTemplateStackProps) {
    super(scope, id, props);

    // Transforms
    this.addTransform('AWS::Serverless-2016-10-31');

    // Resources
    const tables = new DynamodbStack(this, 'Tables', {
      stackName: this.stackName,
    });

    const cognito = new CognitoStack(this, 'Cognito', {
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
    });

    const functions = new FunctionsStack(this, 'Functions', {
      stackName: this.stackName,
        versionNumber: 'foo',
        commitId: 'bar',
        tokenMappingTableName: tables.tokenMappingTableName,
    });

    const apis = new ApisStack(this, 'Apis', {
      stackName: this.stackName,
      statusFunctionName: functions.statusFunctionName,
      statusFunctionArn: functions.statusFunctionArn.toString(),
      userPoolArn: cognito.userPoolArn,
    });

    // Outputs
    this.primaryUserPoolId = cognito.userPoolId;
    new cdk.CfnOutput(this, 'CfnOutputPrimaryUserPoolId', {
      key: 'PrimaryUserPoolId',
      description: 'ID of the created primary Cognito User Pool',
      exportName: `${this.stackName}:Cognito:PrimaryUserPoolId`,
      value: this.primaryUserPoolId!.toString(),
    });
    this.primaryUserPoolClientId = cognito.userPoolClientId;
    new cdk.CfnOutput(this, 'CfnOutputPrimaryUserPoolClientId', {
      key: 'PrimaryUserPoolClientId',
      description: 'ID of the created primary Cognito User Pool client',
      exportName: `${this.stackName}:Cognito:PrimaryUserPoolClientId`,
      value: this.primaryUserPoolClientId!.toString(),
    });
    this.hostedLoginDomain = cognito.hostedLoginDomain;
    new cdk.CfnOutput(this, 'CfnOutputHostedLoginDomain', {
      key: 'HostedLoginDomain',
      description: 'ID of the created primary Cognito User Pool client',
      exportName: `${this.stackName}:Cognito:HostedLoginDomain`,
      value: this.hostedLoginDomain!.toString(),
    });
  }
}
