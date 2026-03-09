import {RemovalPolicy} from "aws-cdk-lib"
import {
  AccountRootPrincipal,
  Effect,
  IRole,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Key} from "aws-cdk-lib/aws-kms"
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  BucketEncryption,
  CfnBucket,
  CfnBucketPolicy,
  IBucket,
  ObjectOwnership
} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"

export interface StaticContentBucketProps {
  readonly bucketName: string
  readonly auditLoggingBucket: IBucket,
  readonly deploymentRole: IRole
}

/**
 * Resources for a static content S3 bucket

 */

export class StaticContentBucket extends Construct{
  public readonly bucket: Bucket
  public readonly kmsKey: Key

  public constructor(scope: Construct, id: string, props: StaticContentBucketProps){
    super(scope, id)

    // Resources
    const accountRootPrincipal = new AccountRootPrincipal()
    const kmsKey = new Key(this, "KmsKey", {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [accountRootPrincipal],
            actions: ["kms:*"],
            resources: ["*"]
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [props.deploymentRole],
            actions: [
              "kms:Encrypt",
              "kms:GenerateDataKey*"
            ],
            resources:["*"]
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [new ServicePrincipal("rum.amazonaws.com")],
            actions: ["kms:Decrypt"],
            resources:["*"],
            conditions: {
              StringEquals: {
                "AWS:SourceAccount": accountRootPrincipal.accountId
              }
            }
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
            actions: [
              "kms:Decrypt",
              "kms:Encrypt",
              "kms:GenerateDataKey*"
            ],
            resources:["*"],
            conditions: {
              StringLike: {
                "AWS:SourceArn": `arn:aws:cloudfront::${accountRootPrincipal.accountId}:distribution/*`
              }
            }
          })
        ]
      })
    })
    kmsKey.addAlias(`alias/${props.bucketName}-KmsKey`)

    const bucket = new Bucket(this, "Bucket", {
      bucketName: props.bucketName,
      encryption: BucketEncryption.KMS,
      bucketKeyEnabled: true,
      encryptionKey: kmsKey,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      accessControl: BucketAccessControl.PRIVATE,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      serverAccessLogsBucket: props.auditLoggingBucket,
      serverAccessLogsPrefix: "static-content/",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    // we need to add a policy to the bucket so that our deploy role can use the bucket
    bucket.addToResourcePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [props.deploymentRole],
      actions: [
        "s3:Abort*",
        "s3:DeleteObject*",
        "s3:GetBucket*",
        "s3:GetObject*",
        "s3:List*",
        "s3:PutObject",
        "s3:PutObjectLegalHold",
        "s3:PutObjectRetention",
        "s3:PutObjectTagging",
        "s3:PutObjectVersionTagging"
      ],
      resources: [
        bucket.bucketArn,
        bucket.arnForObjects("*")
      ]
    }))

    // RUM needs to lookup source maps within the bucket
    bucket.addToResourcePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("rum.amazonaws.com")],
      actions: [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      resources: [
        bucket.bucketArn,
        bucket.arnForObjects("*")
      ],
      conditions: {
        StringEquals: {
          "AWS:SourceAccount": accountRootPrincipal.accountId
        }
      }
    }))

    bucket.addToResourcePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
      actions: ["s3:GetObject"],
      resources: [bucket.arnForObjects("*")],
      conditions: {
        StringLike: {
          "AWS:SourceArn": `arn:aws:cloudfront::${accountRootPrincipal.accountId}:distribution/*`
        }
      }
    }))

    const cfnBucket = bucket.node.defaultChild as CfnBucket
    cfnBucket.cfnOptions.metadata = {
      ...cfnBucket.cfnOptions.metadata,
      guard: {
        SuppressedRules: [
          "S3_BUCKET_REPLICATION_ENABLED",
          "S3_BUCKET_VERSIONING_ENABLED",
          "S3_BUCKET_DEFAULT_LOCK_ENABLED",
          "S3_BUCKET_LOGGING_ENABLED"
        ]
      }
    }

    const policy = bucket.policy!
    const cfnBucketPolicy = policy.node.defaultChild as CfnBucketPolicy
    cfnBucketPolicy.cfnOptions.metadata = (
      {
        ...cfnBucketPolicy.cfnOptions.metadata,
        guard: {
          SuppressedRules: [
            "S3_BUCKET_SSL_REQUESTS_ONLY"
          ]
        }
      }
    )

    //Outputs
    this.bucket = bucket
    this.kmsKey = kmsKey
  }
}
