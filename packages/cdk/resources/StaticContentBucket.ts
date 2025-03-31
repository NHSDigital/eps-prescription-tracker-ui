import {RemovalPolicy} from "aws-cdk-lib"
import {AddToResourcePolicyResult, IRole} from "aws-cdk-lib/aws-iam"
import {CfnKey, Key} from "aws-cdk-lib/aws-kms"
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

import {AllowStaticContentPolicyStatements} from "../policies/s3/AllowStaticContentPolicyStatements"
import {AllowStaticBucketKmsKeyAccessPolicy} from "../policies/kms/AllowStaticBucketKmsKeyAccessPolicy"

export interface StaticContentBucketProps {
  readonly bucketName: string
  readonly allowAutoDeleteObjects: boolean
  readonly cloudfrontDistributionId: string
  readonly auditLoggingBucket: IBucket,
  readonly deploymentRole: IRole
  readonly rumAppName: string
}

/**
 * Resources for a static content S3 bucket

 */

export class StaticContentBucket extends Construct{
  public readonly bucket: Bucket
  public readonly kmsKey: Key
  public readonly addRumBucketPolicy: AddToResourcePolicyResult

  public constructor(scope: Construct, id: string, props: StaticContentBucketProps){
    super(scope, id)

    // Resources
    const kmsKey = new Key(this, "KmsKey", {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY
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
      serverAccessLogsPrefix: "/static-content",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: props.allowAutoDeleteObjects // if true forces a deletion even if bucket is not empty
    })

    const bucketPolicies = new AllowStaticContentPolicyStatements(
      this, "StaticContentBucketAllowCloudfrontGetObjectPolicyStatement", {
        bucket: bucket,
        cloudfrontDistributionId: props.cloudfrontDistributionId,
        rumAppName: props.rumAppName,
        deploymentRole: props.deploymentRole
      })

    // we need to add a policy to the bucket so that our deploy role can use the bucket
    bucket.addToResourcePolicy(bucketPolicies.bucketAllowDeployUploadPolicyStatement)

    // if we have a rum app defined, then add a policy to allow it to be used
    // note - we output this action so it can be used as a dependency for the rum app
    // we can also only do this once the rum app is created
    if (props.rumAppName) {
      const addRumBucketPolicy = bucket.addToResourcePolicy(bucketPolicies.rumAllowReadObject)
      this.addRumBucketPolicy = addRumBucketPolicy
    }
    /*
     we also need to do the same for kms key
     but to avoid circular dependencies we need to use an escape hatch
     this also does a conditional and if we have a cloudfrontDistributionId or rum app
     then it adds the correct policy to allow access from cloudfront and rum
     this is added as one policy rather than using addToResourcePolicy
    */

    const contentBucketKmsKey = (kmsKey.node.defaultChild as CfnKey)
    contentBucketKmsKey.keyPolicy = new AllowStaticBucketKmsKeyAccessPolicy(
      this, "StaticContentBucketAllowKmsKeyAccessPolicy", {
        cloudfrontDistributionId: props.cloudfrontDistributionId,
        deploymentRole: props.deploymentRole,
        rumAppName: props.rumAppName
      }).policyJson

    /* As you cannot modify imported policies, cdk cannot not update the s3 bucket with the correct permissions
    for OAC when the distribution and bucket are in different stacks
    !! This can only be added after the distribution has been deployed !! */
    if (props.cloudfrontDistributionId){
      bucket.addToResourcePolicy(bucketPolicies.cloudfrontAccessPolicyStatement)
    }

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
