import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface DynamodbResourcesStackProps extends cdk.NestedStackProps {
  /**
   * @default 'none'
   */
  readonly stackName?: string;
  /**
   * @default 'none'
   */
  readonly tableName?: string;
  /**
   * @default 'none'
   */
  readonly tableArn?: string;
}

/**
 * Related resources for a DynamoDB table

 */
export class DynamodbResourcesStack extends cdk.NestedStack {
  /**
   * Table read policy arn
   */
  public readonly tableReadPolicyArn;
  /**
   * Table read policy id
   */
  public readonly tableReadPolicyId;
  /**
   * Table write policy arn
   */
  public readonly tableWritePolicyArn;
  /**
   * Table write policy id
   */
  public readonly tableWritePolicyId;

  public constructor(scope: Construct, id: string, props: DynamodbResourcesStackProps = {}) {
    super(scope, id, props);

    // Applying default props
    props = {
      ...props,
      stackName: props.stackName ?? 'none',
      tableName: props.tableName ?? 'none',
      tableArn: props.tableArn ?? 'none',
    };

    // Transforms
    this.addTransform('AWS::Serverless-2016-10-31');

    // Resources
    const tableReadManagedPolicy = new iam.CfnManagedPolicy(this, 'TableReadManagedPolicy', {
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:GetItem',
              'dynamodb:BatchGetItem',
              'dynamodb:Scan',
              'dynamodb:Query',
              'dynamodb:ConditionCheckItem',
              'dynamodb:DescribeTable',
            ],
            Resource: [
              props.tableArn!,
              `${props.tableArn!}/index/*`,
            ],
          },
        ],
      },
    });

    const tableWriteManagedPolicy = new iam.CfnManagedPolicy(this, 'TableWriteManagedPolicy', {
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:PutItem',
              'dynamodb:BatchWriteItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
            ],
            Resource: [
              props.tableArn!,
              `${props.tableArn!}/index/*`,
            ],
          },
        ],
      },
    });

    // Outputs
    this.tableReadPolicyArn = tableReadManagedPolicy.attrPolicyArn;
    new cdk.CfnOutput(this, 'CfnOutputTableReadPolicyArn', {
      key: 'TableReadPolicyArn',
      description: 'Table read policy arn',
      exportName: `${props.stackName!}:tables:${props.tableName!}:TableReadPolicyArn`,
      value: this.tableReadPolicyArn!.toString(),
    });
    this.tableReadPolicyId = tableReadManagedPolicy.attrPolicyId;
    new cdk.CfnOutput(this, 'CfnOutputTableReadPolicyId', {
      key: 'TableReadPolicyId',
      description: 'Table read policy id',
      value: this.tableReadPolicyId!.toString(),
    });
    this.tableWritePolicyArn = tableWriteManagedPolicy.attrPolicyArn;
    new cdk.CfnOutput(this, 'CfnOutputTableWritePolicyArn', {
      key: 'TableWritePolicyArn',
      description: 'Table write policy arn',
      exportName: `${props.stackName!}:tables:${props.tableName!}:TableWritePolicyArn`,
      value: this.tableWritePolicyArn!.toString(),
    });
    this.tableWritePolicyId = tableWriteManagedPolicy.attrPolicyId;
    new cdk.CfnOutput(this, 'CfnOutputTableWritePolicyId', {
      key: 'TableWritePolicyId',
      description: 'Table write policy id',
      value: this.tableWritePolicyId!.toString(),
    });
  }
}
