import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sam from 'aws-cdk-lib/aws-sam';

import { DynamodbResourcesStack } from './dynamodb_resources-stack';
import { Construct } from 'constructs';

export interface DynamodbStackProps extends cdk.NestedStackProps {
  /**
   * @default 'none'
   */
  readonly stackName?: string;
}

/**
 * PSU DynamoDB tables and related resources

 */
export class DynamodbStack extends cdk.NestedStack {
  /**
   * TokenMapping table name
   */
  public readonly tokenMappingTableName;
  /**
   * TokenMapping table arn
   */
  public readonly tokenMappingTableArn;
  /**
   * Use kms key policy arn
   */
  public readonly useTokensMappingKmsKeyPolicyArn;

  public constructor(scope: Construct, id: string, props: DynamodbStackProps = {}) {
    super(scope, id, props);

    // Applying default props
    props = {
      ...props,
      stackName: props.stackName ?? 'none',
    };

    // Transforms
    this.addTransform('AWS::Serverless-2016-10-31');

    // Resources
    const tokensMappingKmsKey = new kms.CfnKey(this, 'TokensMappingKMSKey', {
      enableKeyRotation: true,
      keyPolicy: {
        Version: '2012-10-17',
        Id: 'key-s3',
        Statement: [
          {
            Sid: 'Enable IAM User Permissions',
            Effect: 'Allow',
            Principal: {
              AWS: `arn:aws:iam::${this.account}:root`,
            },
            Action: [
              'kms:*',
            ],
            Resource: '*',
          },
          {
            Sid: 'Enable read only decrypt',
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Action: [
              'kms:DescribeKey',
              'kms:Decrypt',
            ],
            Resource: '*',
            Condition: {
              ArnLike: {
                'aws:PrincipalArn': `arn:aws:iam::${this.account}:role/aws-reserved/sso.amazonaws.com/${this.region}/AWSReservedSSO_ReadOnly*`,
              },
            },
          },
        ],
      },
    });

    const tokenMappingTable = new dynamodb.CfnTable(this, 'TokenMappingTable', {
      tableName: `${props.stackName!}-TokenMapping`,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      attributeDefinitions: [
        {
          attributeName: 'Username',
          attributeType: 'S',
        },
      ],
      keySchema: [
        {
          attributeName: 'Username',
          keyType: 'HASH',
        },
      ],
      billingMode: 'PAY_PER_REQUEST',
      sseSpecification: {
        kmsMasterKeyId: tokensMappingKmsKey.ref,
        sseEnabled: true,
        sseType: 'KMS',
      },
      timeToLiveSpecification: {
        attributeName: 'ExpiryTime',
        enabled: true,
      },
    });

    const tokensMappingKmsKeyAlias = new kms.CfnAlias(this, 'TokensMappingKMSKeyAlias', {
      aliasName: `alias/${props.stackName!}-TokensMappingKMSKeyAlias`,
      targetKeyId: tokensMappingKmsKey.ref,
    });

    const useTokensMappingKmsKeyPolicy = new iam.CfnManagedPolicy(this, 'UseTokensMappingKMSKeyPolicy', {
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'kms:DescribeKey',
              'kms:GenerateDataKey*',
              'kms:Encrypt',
              'kms:ReEncrypt*',
              'kms:Decrypt',
            ],
            Resource: tokensMappingKmsKey.attrArn,
          },
        ],
      },
    });

    const tokenMappingResources = new DynamodbResourcesStack(this, 'TokenMappingResources', {
      stackName: props.stackName!,
      tableName: tokenMappingTable.ref,
      tableArn: tokenMappingTable.attrArn,
    });

    // Outputs
    this.tokenMappingTableName = tokenMappingTable.ref;
    new cdk.CfnOutput(this, 'CfnOutputTokenMappingTableName', {
      key: 'TokenMappingTableName',
      description: 'TokenMapping table name',
      value: this.tokenMappingTableName!.toString(),
    });
    this.tokenMappingTableArn = tokenMappingTable.attrArn;
    new cdk.CfnOutput(this, 'CfnOutputTokenMappingTableArn', {
      key: 'TokenMappingTableArn',
      description: 'TokenMapping table arn',
      value: this.tokenMappingTableArn!.toString(),
    });
    this.useTokensMappingKmsKeyPolicyArn = useTokensMappingKmsKeyPolicy.attrPolicyArn;
    new cdk.CfnOutput(this, 'CfnOutputUseTokensMappingKMSKeyPolicyArn', {
      key: 'UseTokensMappingKMSKeyPolicyArn',
      description: 'Use kms key policy arn',
      exportName: `${props.stackName!}:tables:UseTokensMappingKMSKeyPolicyArn`,
      value: this.useTokensMappingKmsKeyPolicyArn!.toString(),
    });
  }
}
