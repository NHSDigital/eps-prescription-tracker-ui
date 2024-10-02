import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as iam from "aws-cdk-lib/aws-iam"
import * as kms from "aws-cdk-lib/aws-kms"

import {DynamodbResources} from "./dynamodbResources"
import {Construct} from "constructs"

export interface DynamodbProps {
  readonly stackName: string;
  readonly account: string;
  readonly region: string;
}

export class Dynamodb extends Construct {
  public readonly tokenMappingTable: dynamodb.TableV2
  public readonly useTokensMappingKmsKeyPolicy: iam.ManagedPolicy
  public readonly tokenMappingTableWritePolicy: iam.ManagedPolicy
  public readonly tokenMappingTableReadPolicy: iam.ManagedPolicy

  public constructor(scope: Construct, id: string, props: DynamodbProps) {
    super(scope, id)

    // Resources
    const tokensMappingKmsKey = new kms.Key(this, "TokensMappingKMSKey", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(7),
      alias: `${props.stackName}-TokensMappingKMSKey`,
      description: `${props.stackName}-TokensMappingKMSKey`,
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            sid: "Enable read only decrypt",
            effect: iam.Effect.ALLOW,
            actions: [
              "kms:DescribeKey",
              "kms:Decrypt"
            ],
            principals: [
              new iam.AnyPrincipal()
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

    const tokenMappingTable = new dynamodb.TableV2(this, "TokenMappingTable", {
      partitionKey: {
        name: "Username",
        type: dynamodb.AttributeType.STRING
      },
      tableName: `${props.stackName!}-TokenMapping`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryptionV2.customerManagedKey(tokensMappingKmsKey),
      billing: dynamodb.Billing.onDemand(),
      timeToLiveAttribute: "ExpiryTime"

    })

    const useTokensMappingKmsKeyPolicy = new iam.ManagedPolicy(this, "UseTokensMappingKMSKeyPolicy", {
      statements: [
        new iam.PolicyStatement({
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
