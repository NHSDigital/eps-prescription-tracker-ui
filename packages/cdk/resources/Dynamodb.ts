import {Construct} from "constructs"

import {
  AttributeType,
  Billing,
  TableEncryptionV2,
  TableV2
} from "aws-cdk-lib/aws-dynamodb"
import {
  AccountRootPrincipal,
  AnyPrincipal,
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement
} from "aws-cdk-lib/aws-iam"
import {Key} from "aws-cdk-lib/aws-kms"
import {Duration, RemovalPolicy} from "aws-cdk-lib"

export interface DynamodbProps {
  readonly stackName: string
  readonly account: string
  readonly region: string
}

/**
 * Dynamodb tables used for user state information
 */
export class Dynamodb extends Construct {
  public readonly tokenMappingTable: TableV2
  public readonly useTokensMappingKmsKeyPolicy: ManagedPolicy
  public readonly tokenMappingTableWritePolicy: ManagedPolicy
  public readonly tokenMappingTableReadPolicy: ManagedPolicy
  //
  public readonly stateMappingTable: TableV2
  public readonly useStateMappingKmsKeyPolicy: ManagedPolicy
  public readonly stateMappingTableWritePolicy: ManagedPolicy
  public readonly stateMappingTableReadPolicy: ManagedPolicy

  public readonly sessionStateMappingTable: TableV2
  public readonly useSessionStateMappingKmsKeyPolicy: ManagedPolicy
  public readonly sessionStateMappingTableWritePolicy: ManagedPolicy
  public readonly sessionStateMappingTableReadPolicy: ManagedPolicy

  public constructor(scope: Construct, id: string, props: DynamodbProps) {
    super(scope, id)

    // KMS key for token mapping table
    const tokensMappingKmsKey = new Key(this, "TokensMappingKMSKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-TokensMappingKMSKey`,
      description: `${props.stackName}-TokensMappingKMSKey`,
      enableKeyRotation: true,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: "Enable IAM User Permissions",
            effect: Effect.ALLOW,
            actions: [
              "kms:*"
            ],
            principals: [
              new AccountRootPrincipal
            ],
            resources: ["*"]
          }),
          new PolicyStatement({
            sid: "Enable read only decrypt",
            effect: Effect.ALLOW,
            actions: [
              "kms:DescribeKey",
              "kms:Decrypt"
            ],
            principals: [
              new AnyPrincipal()
            ],
            resources: ["*"],
            conditions: {
              ArnLike: {
                // eslint-disable-next-line max-len
                "aws:PrincipalArn": `arn:aws:iam::${props.account}:role/aws-reserved/sso.amazonaws.com/${props.region}/AWSReservedSSO_ReadOnly*`
              }
            }
          })
        ]
      })
    })

    // Token Mapping Table
    const tokenMappingTable = new TableV2(this, "TokenMappingTable", {
      partitionKey: {
        name: "username",
        type: AttributeType.STRING
      },
      tableName: `${props.stackName}-TokenMapping`,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryptionV2.customerManagedKey(tokensMappingKmsKey),
      billing: Billing.onDemand(),
      timeToLiveAttribute: "ExpiryTime"
    })

    // Policy to use token mapping KMS key
    const useTokensMappingKmsKeyPolicy = new ManagedPolicy(this, "UseTokensMappingKMSKeyPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "kms:DescribeKey",
            "kms:GenerateDataKey",
            "kms:Encrypt",
            "kms:ReEncryptFrom",
            "kms:ReEncryptTo",
            "kms:Decrypt"
          ],
          resources: [
            tokensMappingKmsKey.keyArn
          ]
        })
      ]
    })

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
            tokenMappingTable.tableArn,
            `${tokenMappingTable.tableArn}/index/*`
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
            tokenMappingTable.tableArn,
            `${tokenMappingTable.tableArn}/index/*`
          ]
        })
      ]
    })

    // KMS key for state mapping table
    const stateMappingKmsKey = new Key(this, "StateMappingKMSKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-StateMappingKMSKey`,
      description: `${props.stackName}-StateMappingKMSKey`,
      enableKeyRotation: true,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: "Enable IAM User Permissions",
            effect: Effect.ALLOW,
            actions: [
              "kms:*"
            ],
            principals: [
              new AccountRootPrincipal //NOSONAR: Access is controlled via ARN condition.
            ],
            resources: ["*"]
          }),
          new PolicyStatement({
            sid: "Enable read only decrypt",
            effect: Effect.ALLOW,
            actions: [
              "kms:DescribeKey",
              "kms:Decrypt"
            ],
            principals: [
              new AnyPrincipal()
            ],
            resources: ["*"],
            conditions: {
              ArnLike: {
                // eslint-disable-next-line max-len
                "aws:PrincipalArn": `arn:aws:iam::${props.account}:role/aws-reserved/sso.amazonaws.com/${props.region}/AWSReservedSSO_ReadOnly*`
              }
            }
          })
        ]
      })
    })

    // State Mapping Table
    const stateMappingTable = new TableV2(this, "StateMappingTable", {
      partitionKey: {
        name: "State",
        type: AttributeType.STRING
      },
      tableName: `${props.stackName}-StateMapping`,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryptionV2.customerManagedKey(stateMappingKmsKey),
      billing: Billing.onDemand(),
      timeToLiveAttribute: "ExpiryTime"
    })

    // Policy to use state mapping KMS key
    const useStateMappingKmsKeyPolicy = new ManagedPolicy(this, "UseStateMappingKMSKeyPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "kms:DescribeKey",
            "kms:GenerateDataKey",
            "kms:Encrypt",
            "kms:ReEncryptFrom",
            "kms:ReEncryptTo",
            "kms:Decrypt"
          ],
          resources: [
            stateMappingKmsKey.keyArn
          ]
        })
      ]
    })

    const stateTableReadManagedPolicy = new ManagedPolicy(this, "StateTableReadManagedPolicy", {
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
            stateMappingTable.tableArn,
            `${stateMappingTable.tableArn}/index/*`
          ]
        })
      ]
    })

    const stateTableWriteManagedPolicy = new ManagedPolicy(this, "StateTableWriteManagedPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "dynamodb:PutItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          resources: [
            stateMappingTable.tableArn,
            `${stateMappingTable.tableArn}/index/*`
          ]
        })
      ]
    })

    // KMS key for state mapping table
    const sessionStateMappingKmsKey = new Key(this, "SessionStateMappingKMSKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-SessionStateMappingKMSKey`,
      description: `${props.stackName}-SessionStateMappingKMSKey`,
      enableKeyRotation: true,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: "Enable IAM User Permissions",
            effect: Effect.ALLOW,
            actions: [
              "kms:*"
            ],
            principals: [
              new AccountRootPrincipal //NOSONAR: Access is controlled via ARN condition.
            ],
            resources: ["*"]
          }),
          new PolicyStatement({
            sid: "Enable read only decrypt",
            effect: Effect.ALLOW,
            actions: [
              "kms:DescribeKey",
              "kms:Decrypt"
            ],
            principals: [
              new AnyPrincipal()
            ],
            resources: ["*"],
            conditions: {
              ArnLike: {
                // eslint-disable-next-line max-len
                "aws:PrincipalArn": `arn:aws:iam::${props.account}:role/aws-reserved/sso.amazonaws.com/${props.region}/AWSReservedSSO_ReadOnly*`
              }
            }
          })
        ]
      })
    })

    // State Mapping Table
    const sessionStateMappingTable = new TableV2(this, "SessionStateMappingTable", {
      partitionKey: {
        name: "LocalCode",
        type: AttributeType.STRING
      },
      tableName: `${props.stackName}-SessionStateMapping`,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryptionV2.customerManagedKey(stateMappingKmsKey),
      billing: Billing.onDemand(),
      timeToLiveAttribute: "ExpiryTime"
    })

    // Policy to use state mapping KMS key
    const useSessionStateMappingKmsKeyPolicy = new ManagedPolicy(this, "UseSessionStateMappingKMSKeyPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "kms:DescribeKey",
            "kms:GenerateDataKey",
            "kms:Encrypt",
            "kms:ReEncryptFrom",
            "kms:ReEncryptTo",
            "kms:Decrypt"
          ],
          resources: [
            sessionStateMappingKmsKey.keyArn
          ]
        })
      ]
    })

    const sessionStateTableReadManagedPolicy = new ManagedPolicy(this, "SessionStateTableReadManagedPolicy", {
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
            sessionStateMappingTable.tableArn,
            `${sessionStateMappingTable.tableArn}/index/*`
          ]
        })
      ]
    })

    const sessionStateTableWriteManagedPolicy = new ManagedPolicy(this, "SessionStateTableWriteManagedPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "dynamodb:PutItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          resources: [
            sessionStateMappingTable.tableArn,
            `${sessionStateMappingTable.tableArn}/index/*`
          ]
        })
      ]
    })

    // Outputs: assign the created resources to the class properties
    this.tokenMappingTable = tokenMappingTable
    this.useTokensMappingKmsKeyPolicy = useTokensMappingKmsKeyPolicy
    this.tokenMappingTableWritePolicy = tableWriteManagedPolicy
    this.tokenMappingTableReadPolicy = tableReadManagedPolicy

    this.stateMappingTable = stateMappingTable
    this.useStateMappingKmsKeyPolicy = useStateMappingKmsKeyPolicy
    this.stateMappingTableWritePolicy = stateTableWriteManagedPolicy
    this.stateMappingTableReadPolicy = stateTableReadManagedPolicy

    this.sessionStateMappingTable = sessionStateMappingTable
    this.useSessionStateMappingKmsKeyPolicy = useSessionStateMappingKmsKeyPolicy
    this.sessionStateMappingTableWritePolicy = sessionStateTableWriteManagedPolicy
    this.sessionStateMappingTableReadPolicy = sessionStateTableReadManagedPolicy

  }
}
