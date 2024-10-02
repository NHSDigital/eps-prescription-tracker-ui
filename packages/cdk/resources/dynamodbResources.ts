import * as iam from "aws-cdk-lib/aws-iam"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"

import {Construct} from "constructs"
import {NagSuppressions} from "cdk-nag"
export interface DynamodbResourcesProps {
  readonly stackName: string;
  readonly table: dynamodb.TableV2;
}

export class DynamodbResources extends Construct {
  public readonly tableReadPolicy: iam.ManagedPolicy
  public readonly tableWritePolicy: iam.ManagedPolicy

  public constructor(scope: Construct, id: string, props: DynamodbResourcesProps) {
    super(scope, id)

    // Resources
    const tableReadManagedPolicy = new iam.ManagedPolicy(this, "TableReadManagedPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "dynamodb:GetItem",
            "dynamodb:BatchGetItem",
            "dynamodb:Scan",
            "dynamodb:Query",
            "dynamodb:ConditionCheckItem",
            "dynamodb:DescribeTable"
          ],
          resources: [
            props.table.tableArn!,
            `${props.table.tableArn!}/index/*`
          ]
        })
      ]
    })

    NagSuppressions.addResourceSuppressions(tableReadManagedPolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard reading indexes"
      }
    ])

    const tableWriteManagedPolicy = new iam.ManagedPolicy(this, "TableWriteManagedPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "dynamodb:PutItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          resources: [
            props.table.tableArn!,
            `${props.table.tableArn!}/index/*`
          ]
        })
      ]
    })

    NagSuppressions.addResourceSuppressions(tableWriteManagedPolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard writing indexes"
      }
    ])

    // Outputs
    this.tableReadPolicy = tableReadManagedPolicy
    this.tableWritePolicy = tableWriteManagedPolicy
  }
}
