import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiResourcesStackProps extends cdk.NestedStackProps {
  /**
   * A list of additional policies to attach to the API gateway role (comma delimited).
   * @default 'none'
   */
  readonly additionalPolicies?: string[];
  /**
   * @default 'none'
   */
  readonly apiName?: string;
  /**
   * @default 30
   */
  readonly logRetentionInDays?: number;
  /**
   * @default 'false'
   */
  readonly enableSplunk?: string;
}

/**
 * Resources for an API

 */
export class ApiResourcesStack extends cdk.NestedStack {
  /**
   * The API GW role ARN
   */
  public readonly apiGwRoleArn;
  /**
   * The API GW access logs ARN
   */
  public readonly apiGwAccessLogsArn;

  public constructor(scope: Construct, id: string, props: ApiResourcesStackProps = {}) {
    super(scope, id, props);

    // Applying default props
    props = {
      ...props,
      additionalPolicies: props.additionalPolicies ?? ['none'],
      apiName: props.apiName ?? 'none',
      logRetentionInDays: props.logRetentionInDays ?? 30,
      enableSplunk: props.enableSplunk ?? 'false',
    };

    // Transforms
    this.addTransform('AWS::Serverless-2016-10-31');

    // Conditions
    const shouldUseSplunk = 'true' === props.enableSplunk!;

    // Resources
    const apiGwAccessLogs = new logs.CfnLogGroup(this, 'ApiGwAccessLogs', {
      logGroupName: `/aws/apigateway/${props.apiName!}`,
      retentionInDays: props.logRetentionInDays!,
      kmsKeyId: cdk.Fn.importValue('account-resources:CloudwatchLogsKmsKeyArn'),
    });
    apiGwAccessLogs.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          'CW_LOGGROUP_RETENTION_PERIOD_CHECK',
        ],
      },
    };

    const apiGwRole = new iam.CfnRole(this, 'ApiGwRole', {
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: [
                'apigateway.amazonaws.com',
              ],
            },
            Action: [
              'sts:AssumeRole',
            ],
          },
        ],
      },
      managedPolicyArns: cdk.Fn.split(',', [
        [
          props.additionalPolicies!,
        ].join(','),
      ].join(',')),
    });

    const apiGwAccessLogsSplunkSubscriptionFilter = shouldUseSplunk
      ? new logs.CfnSubscriptionFilter(this, 'ApiGwAccessLogsSplunkSubscriptionFilter', {
          roleArn: cdk.Fn.importValue('lambda-resources:SplunkSubscriptionFilterRole'),
          logGroupName: apiGwAccessLogs.ref,
          filterPattern: '',
          destinationArn: cdk.Fn.importValue('lambda-resources:SplunkDeliveryStream'),
        })
      : undefined;
    if (apiGwAccessLogsSplunkSubscriptionFilter != null) {
    }

    // Outputs
    this.apiGwRoleArn = apiGwRole.attrArn;
    new cdk.CfnOutput(this, 'CfnOutputApiGwRoleArn', {
      key: 'ApiGwRoleArn',
      description: 'The API GW role ARN',
      value: this.apiGwRoleArn!.toString(),
    });
    this.apiGwAccessLogsArn = apiGwAccessLogs.attrArn;
    new cdk.CfnOutput(this, 'CfnOutputApiGwAccessLogsArn', {
      key: 'ApiGwAccessLogsArn',
      description: 'The API GW access logs ARN',
      value: this.apiGwAccessLogsArn!.toString(),
    });
  }
}
