import {Construct} from "constructs"
import {ManagedPolicy, PolicyStatement} from "aws-cdk-lib/aws-iam"
import {TableV2} from "aws-cdk-lib/aws-dynamodb"

export interface DynamodbResourcesProps {
  readonly stackName: string;
  readonly table: TableV2;
}

export class DynamodbResources extends Construct {
  public readonly tableReadPolicy: ManagedPolicy
  public readonly tableWritePolicy: ManagedPolicy

  public constructor(scope: Construct, id: string, props: DynamodbResourcesProps) {
    super(scope, id)

    // Resources
    const tableReadManagedPolicy = new ManagedPolicy(this, "TableReadManagedPolicy", {
      statements: [
        new PolicyStatement({
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

    const tableWriteManagedPolicy = new ManagedPolicy(this, "TableWriteManagedPolicy", {
      statements: [
        new PolicyStatement({
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

    // Outputs
    this.tableReadPolicy = tableReadManagedPolicy
    this.tableWritePolicy = tableWriteManagedPolicy
  }
}
