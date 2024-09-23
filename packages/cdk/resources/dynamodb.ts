import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as iam from "aws-cdk-lib/aws-iam"
import * as kms from "aws-cdk-lib/aws-kms"

import {DynamodbResources} from "./dynamodbResources"
import {Construct} from "constructs"

export interface DynamodbProps {
  /**
   * @default 'none'
   */
  readonly stackName: string;
  readonly account: string;
  readonly region: string;
}

/**
 * PSU DynamoDB tables and related resources

 */
export class Dynamodb extends Construct {
  /**
   * TokenMapping table name
   */
  public readonly tokenMappingTableName
  /**
   * TokenMapping table arn
   */
  public readonly tokenMappingTableArn
  /**
   * Use kms key policy arn
   */
  public readonly useTokensMappingKmsKeyPolicyArn
  public readonly tokenMappingTableWritePolicyArn
  public readonly tokenMappingTableWritePolicyId
  public readonly tokenMappingTableReadPolicyArn
  public readonly tokenMappingTableReadPolicyId

  public constructor(scope: Construct, id: string, props: DynamodbProps) {
    super(scope, id)

    // Applying default props
    props = {
      ...props,
      stackName: props.stackName,
      account: props.account,
      region: props.region
    }

    // Resources
    const tokensMappingKmsKey = new kms.CfnKey(this, "TokensMappingKMSKey", {
      enableKeyRotation: true,
      keyPolicy: {
        Version: "2012-10-17",
        Id: "key-s3",
        Statement: [
          {
            Sid: "Enable IAM User Permissions",
            Effect: "Allow",
            Principal: {
              AWS: `arn:aws:iam::${props.account}:root`
            },
            Action: [
              "kms:*"
            ],
            Resource: "*"
          },
          {
            Sid: "Enable read only decrypt",
            Effect: "Allow",
            Principal: {
              AWS: "*"
            },
            Action: [
              "kms:DescribeKey",
              "kms:Decrypt"
            ],
            Resource: "*",
            Condition: {
              ArnLike: {
                // eslint-disable-next-line max-len
                "aws:PrincipalArn": `arn:aws:iam::${props.account}:role/aws-reserved/sso.amazonaws.com/${props.region}/AWSReservedSSO_ReadOnly*`
              }
            }
          }
        ]
      }
    })
    const tokenMappingTable = new dynamodb.CfnTable(this, "TokenMappingTable", {
      tableName: `${props.stackName!}-TokenMapping`,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      attributeDefinitions: [
        {
          attributeName: "Username",
          attributeType: "S"
        }
      ],
      keySchema: [
        {
          attributeName: "Username",
          keyType: "HASH"
        }
      ],
      billingMode: "PAY_PER_REQUEST",
      sseSpecification: {
        kmsMasterKeyId: tokensMappingKmsKey.ref,
        sseEnabled: true,
        sseType: "KMS"
      },
      timeToLiveSpecification: {
        attributeName: "ExpiryTime",
        enabled: true
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tokensMappingKmsKeyAlias = new kms.CfnAlias(this, "TokensMappingKMSKeyAlias", {
      aliasName: `alias/${props.stackName!}-TokensMappingKMSKeyAlias`,
      targetKeyId: tokensMappingKmsKey.ref
    })

    const useTokensMappingKmsKeyPolicy = new iam.CfnManagedPolicy(this, "UseTokensMappingKMSKeyPolicy", {
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "kms:DescribeKey",
              "kms:GenerateDataKey",
              "kms:Encrypt",
              "kms:ReEncryptFrom",
              "kms:ReEncryptTo",
              "kms:Decrypt"
            ],
            Resource: tokensMappingKmsKey.attrArn
          }
        ]
      }
    })
    const tokenMappingResources = new DynamodbResources(this, "TokenMappingResources", {
      stackName: props.stackName!,
      tableName: tokenMappingTable.ref,
      tableArn: tokenMappingTable.attrArn
    })

    // Outputs
    this.tokenMappingTableName = tokenMappingTable.ref
    this.tokenMappingTableArn = tokenMappingTable.attrArn
    this.useTokensMappingKmsKeyPolicyArn = useTokensMappingKmsKeyPolicy.attrPolicyArn
    this.tokenMappingTableWritePolicyArn = tokenMappingResources.tableWritePolicyArn
    this.tokenMappingTableWritePolicyId = tokenMappingResources.tableWritePolicyId
    this.tokenMappingTableReadPolicyArn = tokenMappingResources.tableReadPolicyArn
    this.tokenMappingTableReadPolicyId = tokenMappingResources.tableReadPolicyId
  }
}
