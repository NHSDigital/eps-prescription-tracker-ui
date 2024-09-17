import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface LambdaResourcesStackProps extends cdk.NestedStackProps {
  /**
   */
  readonly stackName: string;
  /**
   * @default 'none'
   */
  readonly lambdaName?: string;
  /**
   * @default 'none'
   */
  readonly lambdaArn?: string;
  /**
   * @default 'false'
   */
  readonly includeAdditionalPolicies?: boolean;
  /**
   * A list of additional policies to attach the lambdas role (comma delimited).
   * @default 'none'
   */
  readonly additionalPolicies?: string[];
  /**
   */
  readonly logRetentionInDays: number;
  /**
   * @default 30
   */
  readonly cloudWatchKmsKeyId?: string;
  /**
   */
  readonly enableSplunk: boolean;
  /**
   * @default 'none'
   */
  readonly splunkSubscriptionFilterRole?: string;
  /**
   * @default 'none'
   */
  readonly splunkDeliveryStreamArn?: string;
}

/**
 * Resources for a lambda

 */
export class LambdaResourcesStack extends cdk.NestedStack {
  /**
   * LambdaRole ARN
   */
  public readonly lambdaRoleArn;
  /**
   * Lambda execution policy arn
   */
  public readonly executeLambdaPolicyArn;

  public constructor(scope: Construct, id: string, props: LambdaResourcesStackProps) {
    super(scope, id, props);

    // Applying default props
    props = {
      ...props,
      lambdaName: props.lambdaName ?? 'none',
      lambdaArn: props.lambdaArn ?? 'none',
      includeAdditionalPolicies: props.includeAdditionalPolicies ?? false,
      additionalPolicies: props.additionalPolicies ?? ['none'],
      cloudWatchKmsKeyId: props.cloudWatchKmsKeyId ?? 'none',
      splunkSubscriptionFilterRole: props.splunkSubscriptionFilterRole ?? 'none',
      splunkDeliveryStreamArn: props.splunkDeliveryStreamArn ?? 'none',
    };

    // Transforms
    this.addTransform('AWS::Serverless-2016-10-31');

    // Conditions
    const shouldIncludeAdditionalPolicies = true === props.includeAdditionalPolicies!;
    const shouldUseSplunk = true === props.enableSplunk!;

    // Resources
    const executeLambdaManagedPolicy = new iam.CfnManagedPolicy(this, 'ExecuteLambdaManagedPolicy', {
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'lambda:InvokeFunction',
            ],
            Resource: [
              `${props.lambdaArn!}*`,
            ],
          },
        ],
      },
    });

    const lambdaLogGroup = new logs.CfnLogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/${props.lambdaName!}`,
      retentionInDays: props.logRetentionInDays!,
      kmsKeyId: props.cloudWatchKmsKeyId!,
    });
    lambdaLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          'CW_LOGGROUP_RETENTION_PERIOD_CHECK',
        ],
      },
    };

    const lambdaManagedPolicy = new iam.CfnManagedPolicy(this, 'LambdaManagedPolicy', {
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
            Resource: [
              lambdaLogGroup.attrArn,
              `${lambdaLogGroup.attrArn}:log-stream:*`,
            ],
          },
        ],
      },
    });

    const lambdaSplunkSubscriptionFilter = shouldUseSplunk
      ? new logs.CfnSubscriptionFilter(this, 'LambdaSplunkSubscriptionFilter', {
          roleArn: props.splunkSubscriptionFilterRole!,
          logGroupName: lambdaLogGroup.ref,
          filterPattern: '',
          destinationArn: props.splunkDeliveryStreamArn!,
        })
      : undefined;
    if (lambdaSplunkSubscriptionFilter != null) {
    }

    const lambdaRole = new iam.CfnRole(this, 'LambdaRole', {
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: [
              'sts:AssumeRole',
            ],
          },
        ],
      },
      managedPolicyArns: cdk.Fn.split(',', [
        lambdaManagedPolicy.ref,
        cdk.Fn.importValue('lambda-resources:LambdaInsightsLogGroupPolicy'),
        cdk.Fn.importValue('account-resources:CloudwatchEncryptionKMSPolicyArn'),
        cdk.Fn.importValue('account-resources:LambdaDecryptSecretsKMSPolicy'),
        shouldIncludeAdditionalPolicies ? [
          props.additionalPolicies!,
        ].join(',') : undefined,
      ].join(',')),
    });

    // Outputs
    this.lambdaRoleArn = lambdaRole.attrArn;
    new cdk.CfnOutput(this, 'CfnOutputLambdaRoleArn', {
      key: 'LambdaRoleArn',
      description: 'LambdaRole ARN',
      value: this.lambdaRoleArn!.toString(),
    });
    this.executeLambdaPolicyArn = executeLambdaManagedPolicy.attrPolicyArn;
    new cdk.CfnOutput(this, 'CfnOutputExecuteLambdaPolicyArn', {
      key: 'ExecuteLambdaPolicyArn',
      description: 'Lambda execution policy arn',
      exportName: `${props.stackName!}:functions:${props.lambdaName!}:ExecuteLambdaPolicyArn`,
      value: this.executeLambdaPolicyArn!.toString(),
    });
  }
}
