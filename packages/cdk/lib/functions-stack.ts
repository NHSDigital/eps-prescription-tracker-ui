import * as cdk from 'aws-cdk-lib';
import * as sam from 'aws-cdk-lib/aws-sam';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

import { LambdaResourcesStack } from './lambda_resources-stack';
import { Construct } from 'constructs';

export interface FunctionsStackProps extends cdk.NestedStackProps {
  /**
   * @default 'none'
   */
  readonly stackName?: string;
  /**
   */
  readonly versionNumber: string;
  /**
   */
  readonly commitId: string;
  /**
   */
  readonly tokenMappingTableName: string;
}

/**
 * PFP lambda functions and related resources

 */
export class FunctionsStack extends cdk.NestedStack {
  /**
   * The function name of the Status lambda
   */
  public readonly statusFunctionName;
  /**
   * The function ARN of the Status lambda
   */
  public readonly statusFunctionArn;

  public constructor(scope: Construct, id: string, props: FunctionsStackProps) {
    super(scope, id, props);

    // Applying default props
    props = {
      ...props,
      stackName: props.stackName ?? 'none',
    };

    // Transforms
    this.addTransform('AWS::Serverless-2016-10-31');

    // Resources
    const statusResources = new LambdaResourcesStack(this, 'StatusResources', {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-status`,
      lambdaArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stackName!}-status`,
      includeAdditionalPolicies: true,
        additionalPolicies: [
          cdk.Fn.importValue('account-resources:LambdaAccessSecretsPolicy'),
          cdk.Fn.importValue(`${props.stackName!}:tables:${props.tokenMappingTableName!}:TableWritePolicyArn`),
          cdk.Fn.importValue(`${props.stackName!}:tables:${props.tokenMappingTableName!}:TableReadPolicyArn`),
          cdk.Fn.importValue(`${props.stackName!}:tables:UseTokensMappingKMSKeyPolicyArn`),
        ],
        logRetentionInDays: 30,
        cloudWatchKmsKeyId: cdk.Fn.importValue('account-resources:CloudwatchLogsKmsKeyArn'),
        enableSplunk: false,
        splunkSubscriptionFilterRole: cdk.Fn.importValue('lambda-resources:SplunkSubscriptionFilterRole'),
        splunkDeliveryStreamArn: cdk.Fn.importValue('lambda-resources:SplunkDeliveryStream'),
    });


    const createOrderLambda = new nodeLambda.NodejsFunction(this, 'CreateOrderLambda', {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname,"../../statusLambda/src/statusLambda.ts"),
        projectRoot: path.join(__dirname,'../'),
        memorySize: 1024,
        handler: 'statusLambda.handler',
        bundling: {
          minify: true,
          sourceMap: true,
          tsconfig: "../statusLambda/tsconfig.json",
          target: 'es2020'
        },
        environment: {
          'VERSION_NUMBER': props.versionNumber!,
          'COMMIT_ID': props.commitId!,
          TokenMappingTableName: props.tokenMappingTableName!,
        },
      });
      
    const status = new sam.CfnFunction(this, 'Status', {
      functionName: `${props.stackName!}-status`,
      codeUri: '../../packages',
      handler: 'statusLambda.handler',
      role: statusResources.lambdaRoleArn,
      environment: {
        variables: {
          'VERSION_NUMBER': props.versionNumber!,
          'COMMIT_ID': props.commitId!,
          TokenMappingTableName: props.tokenMappingTableName!,
        },
      },
    });
    status.cfnOptions.metadata = {
      BuildMethod: 'esbuild',
      guard: {
        SuppressedRules: [
          'LAMBDA_DLQ_CHECK',
          'LAMBDA_INSIDE_VPC',
          'LAMBDA_CONCURRENCY_CHECK',
        ],
      },
      BuildProperties: {
        Minify: true,
        Target: 'es2020',
        Sourcemap: true,
        tsconfig: 'statusLambda/tsconfig.json',
        packages: 'bundle',
        EntryPoints: [
          'statusLambda/src/statusLambda.ts',
        ],
      },
    };

    // Outputs
    this.statusFunctionName = status.ref;
    new cdk.CfnOutput(this, 'CfnOutputStatusFunctionName', {
      key: 'StatusFunctionName',
      description: 'The function name of the Status lambda',
      value: this.statusFunctionName!.toString(),
    });
    this.statusFunctionArn = status.getAtt("Arn");
    new cdk.CfnOutput(this, 'CfnOutputStatusFunctionArn', {
      key: 'StatusFunctionArn',
      description: 'The function ARN of the Status lambda',
      value: this.statusFunctionArn!.toString(),
    });
  }
}
