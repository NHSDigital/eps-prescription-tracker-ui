import {Construct} from "constructs"

import {DynamodbResources} from "./Dynamodb/dynamodbResources"
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
  readonly stackName: string;
  readonly account: string;
  readonly region: string;
}

export class Dynamodb extends Construct {
  public readonly tokenMappingTable: TableV2
  public readonly useTokensMappingKmsKeyPolicy: ManagedPolicy
  public readonly tokenMappingTableWritePolicy: ManagedPolicy
  public readonly tokenMappingTableReadPolicy: ManagedPolicy

  public constructor(scope: Construct, id: string, props: DynamodbProps) {
    super(scope, id)

    // Resources
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

    const tokenMappingResources = new DynamodbResources(this, "TokenMappingResources", {
      stackName: props.stackName,
      table: tokenMappingTable
    })

    // Outputs
    this.tokenMappingTable = tokenMappingTable
    this.useTokensMappingKmsKeyPolicy = useTokensMappingKmsKeyPolicy
    this.tokenMappingTableWritePolicy = tokenMappingResources.tableWritePolicy
    this.tokenMappingTableReadPolicy = tokenMappingResources.tableReadPolicy
  }
}
