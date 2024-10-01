import * as iam from "aws-cdk-lib/aws-iam"
import {Construct} from "constructs"
import {NagSuppressions} from "cdk-nag"
export interface DynamodbResourcesProps {
  /**
   * @default 'none'
   */
  readonly stackName: string;
  /**
   * @default 'none'
   */
  readonly tableName: string;
  /**
   * @default 'none'
   */
  readonly tableArn: string;
}

/**
 * Related resources for a DynamoDB table

 */
export class DynamodbResources extends Construct {
  /**
   * Table read policy arn
   */
  public readonly tableReadPolicyArn
  /**
   * Table read policy id
   */
  public readonly tableReadPolicyId
  /**
   * Table write policy arn
   */
  public readonly tableWritePolicyArn
  /**
   * Table write policy id
   */
  public readonly tableWritePolicyId

  public constructor(scope: Construct, id: string, props: DynamodbResourcesProps) {
    super(scope, id)

    // Applying default props
    props = {
      ...props,
      stackName: props.stackName,
      tableName: props.tableName,
      tableArn: props.tableArn
    }

    // Resources
    const tableReadManagedPolicy = new iam.CfnManagedPolicy(this, "TableReadManagedPolicy", {
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "dynamodb:GetItem",
              "dynamodb:BatchGetItem",
              "dynamodb:Scan",
              "dynamodb:Query",
              "dynamodb:ConditionCheckItem",
              "dynamodb:DescribeTable"
            ],
            Resource: [
              props.tableArn!,
              `${props.tableArn!}/index/*`
            ]
          }
        ]
      }
    })
    NagSuppressions.addResourceSuppressions(tableReadManagedPolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard reading indexes"
      }
    ])

    const tableWriteManagedPolicy = new iam.CfnManagedPolicy(this, "TableWriteManagedPolicy", {
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "dynamodb:PutItem",
              "dynamodb:BatchWriteItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem"
            ],
            Resource: [
              props.tableArn!,
              `${props.tableArn!}/index/*`
            ]
          }
        ]
      }
    })
    NagSuppressions.addResourceSuppressions(tableWriteManagedPolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard writing indexes"
      }
    ])

    // Outputs
    this.tableReadPolicyArn = tableReadManagedPolicy.attrPolicyArn
    this.tableReadPolicyId = tableReadManagedPolicy.attrPolicyId
    this.tableWritePolicyArn = tableWriteManagedPolicy.attrPolicyArn
    this.tableWritePolicyId = tableWriteManagedPolicy.attrPolicyId
  }
}