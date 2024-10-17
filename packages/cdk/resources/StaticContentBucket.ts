import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {Role} from "aws-cdk-lib/aws-iam"
import {Key} from "aws-cdk-lib/aws-kms"
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  BucketEncryption,
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

    // Resources
    const kmsKey = new Key(this, "KmsKey", {
      enableKeyRotation: true
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
      serverAccessLogsPrefix: "/static-content",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true // forces a deletion even if bucket is not empty
    })

    bucket.grantReadWrite(deploymentRole)

    //Outputs
    this.bucket = bucket
    this.kmsKey = kmsKey
  }
}
