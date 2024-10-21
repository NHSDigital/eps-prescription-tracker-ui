import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {
  AccountRootPrincipal,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {CfnKey, Key} from "aws-cdk-lib/aws-kms"
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  BucketEncryption,
  CfnBucket,
  CfnBucketPolicy,
  ObjectOwnership
} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"

/**
 * Resources for a static content S3 bucket

 */

export class StaticContentBucket extends Construct{
  public readonly bucket: Bucket
  public kmsKey: Key

  public constructor(scope: Construct, id: string){
    super(scope, id)

    // Imports
    const auditLoggingBucket = Bucket.fromBucketArn(
      this, "AuditLoggingBucket", Fn.importValue("account-resources:AuditLoggingBucket"))

    const deploymentRole = Role.fromRoleArn(
      this, "deploymentRole", Fn.importValue("ci-resources:CloudFormationDeployRole"))
    const cloudfrontDistributionId = this.node.tryGetContext("cloudfrontDistributionId")

    // Resources
    const kmsKey = new Key(this, "KmsKey", {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY
    })
    kmsKey.addAlias("alias/StaticContentBucketKmsKey")

    const bucket = new Bucket(this, "Bucket", {
      encryption: BucketEncryption.KMS,
      bucketKeyEnabled: true,
      encryptionKey: kmsKey,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      accessControl: BucketAccessControl.PRIVATE,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      serverAccessLogsBucket: auditLoggingBucket,
      serverAccessLogsPrefix: "/static-content/",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: false // forces a deletion even if bucket is not empty
    })

    const cfnBucket = bucket.node.defaultChild as CfnBucket
    cfnBucket.cfnOptions.metadata = {
      ...cfnBucket.cfnOptions.metadata,
      "guard": {
        "SuppressedRules": [
          "S3_BUCKET_REPLICATION_ENABLED",
          "S3_BUCKET_VERSIONING_ENABLED",
          "S3_BUCKET_DEFAULT_LOCK_ENABLED"
        ]
      }
    }

    if (cloudfrontDistributionId !== "") {
      const accountId = new AccountRootPrincipal().accountId
      bucket.addToResourcePolicy( new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [bucket.arnForObjects("*")],
        principals: [ new ServicePrincipal("cloudfront.amazonaws.com")],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${accountId}:distribution/${cloudfrontDistributionId}`
          }
        }
      }))

      // we need to use an escape hatch on the kms key to avoid circular references
      // see https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_cloudfront_origins/README.html#s3-bucket
      const scopedDownKeyPolicy = {
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Principal": {
            "AWS": `arn:aws:iam::${accountId}:root`
          },
          "Action": "kms:*",
          "Resource": "*"
        }, {
          "Effect": "Allow",
          "Principal": {
            "Service": "cloudfront.amazonaws.com"
          },
          "Action": ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey*"
          ],
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "AWS:SourceArn": `arn:aws:cloudfront::${accountId}:distribution/${cloudfrontDistributionId}`
            }
          }
        }
        ]
      }

      const cfnKey = kmsKey.node.defaultChild as CfnKey
      cfnKey.keyPolicy = scopedDownKeyPolicy
    }
    bucket.grantReadWrite(deploymentRole)
    const policy = bucket.policy!
    const cfnBucketPolicy = policy.node.defaultChild as CfnBucketPolicy
    cfnBucketPolicy.cfnOptions.metadata = (
      {
        ...cfnBucketPolicy.cfnOptions.metadata,
        "guard": {
          "SuppressedRules": [
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
