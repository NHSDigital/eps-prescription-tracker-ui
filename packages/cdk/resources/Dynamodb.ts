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

  public readonly sessionManagementTable: TableV2
  public readonly useSessionManagementTableKmsKeyPolicy: ManagedPolicy
  public readonly sessionManagementTableWritePolicy: ManagedPolicy
  public readonly sessionManagementTableReadPolicy: ManagedPolicy

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
    this.tokenMappingTable = new TableV2(this, "TokenMappingTable", {
      partitionKey: {
        name: "username",
        type: AttributeType.STRING
      },
      tableName: `${props.stackName}-TokenMapping`,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      encryption: TableEncryptionV2.customerManagedKey(tokensMappingKmsKey),
      billing: Billing.onDemand(),
      timeToLiveAttribute: "ExpiryTime"
    })

    // Policy to use token mapping KMS key
    this.useTokensMappingKmsKeyPolicy = new ManagedPolicy(this, "UseTokensMappingKMSKeyPolicy", {
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

    this.tokenMappingTableReadPolicy = new ManagedPolicy(this, "TableReadManagedPolicy", {
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
            this.tokenMappingTable.tableArn,
            `${this.tokenMappingTable.tableArn}/index/*`
          ]
        })
      ]
    })

    this.tokenMappingTableWritePolicy = new ManagedPolicy(this, "TableWriteManagedPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "dynamodb:PutItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          resources: [
            this.tokenMappingTable.tableArn,
            `${this.tokenMappingTable.tableArn}/index/*`
          ]
        })
      ]
    })

    // Session management table is identical to token mapping but it's
    // used to support draft concurrent sessions, ensuring the newest session
    // isn't updating existing sessions apigee tokens
    const sessionManagementKmsKey = new Key(this, "SessionManagementKMSKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `${props.stackName}-SessionManagementKMSKey`,
      description: `${props.stackName}-SessionManagementKMSKey`,
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

    this.sessionManagementTable = new TableV2(this, "SessionManagementTable", {
      partitionKey: {
        name: "username",
        type: AttributeType.STRING
      },
      tableName: `${props.stackName}-SessionManagement`,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      encryption: TableEncryptionV2.customerManagedKey(sessionManagementKmsKey),
      billing: Billing.onDemand(),
      timeToLiveAttribute: "ExpiryTime"
    })

    // Policy to use token mapping KMS key
    this.useSessionManagementTableKmsKeyPolicy = new ManagedPolicy(this, "UseSessionManagementKMSKeyPolicy", {
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
            sessionManagementKmsKey.keyArn
          ]
        })
      ]
    })

    this.sessionManagementTableReadPolicy = new ManagedPolicy(this, "SessionManagementReadManagedPolicy", {
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
            this.sessionManagementTable.tableArn,
            `${this.sessionManagementTable.tableArn}/index/*`
          ]
        })
      ]
    })

    this.sessionManagementTableWritePolicy = new ManagedPolicy(this, "SessionManagementWriteManagedPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "dynamodb:PutItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          resources: [
            this.sessionManagementTable.tableArn,
            `${this.sessionManagementTable.tableArn}/index/*`
          ]
        })
      ]
    })
  }
}
