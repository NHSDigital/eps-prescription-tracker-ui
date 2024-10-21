import {RemovalPolicy} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
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

export class CloudfrontAuditBucket extends Construct{
  public readonly bucket: Bucket
  public kmsKey: Key

  public constructor(scope: Construct, id: string){
    super(scope, id)

    // Resources
    const kmsKey = new Key(this, "KmsKey", {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY
    })
    kmsKey.addAlias("alias/CloudfrontAuditBucketKmsKey")

    const bucket = new Bucket(this, "Bucket", {
      encryption: BucketEncryption.KMS,
      bucketKeyEnabled: true,
      encryptionKey: kmsKey,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      accessControl: BucketAccessControl.PRIVATE,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
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
