import {RemovalPolicy} from "aws-cdk-lib"
import {
  Effect,
  IRole,
  PolicyStatement,
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
  IBucket,
  ObjectOwnership
} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"

import {AllowCloudfrontGetObjectPolicyStatement} from "../policies/s3/AllowCloudfrontGetObjectPolicyStatement"
import {AllowCloudfrontKmsKeyAccessPolicy} from "../policies/kms/AllowCloudfrontKmsKeyAccessPolicy"

export interface StaticContentBucketProps {
  readonly bucketName: string
  readonly allowAutoDeleteObjects: boolean
  readonly cloudfrontDistributionId: string
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

    // we need to add a policy to the bucket so that our deploy role can use the bucket
    const bucketAllowDeployUploadPolicyStatement = new PolicyStatement({
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
    })
    bucket.addToResourcePolicy(bucketAllowDeployUploadPolicyStatement)

    const rumAllowReadObject = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("rum.amazonaws.com")],
      actions: [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      resources: [
        bucket.bucketArn,
        bucket.arnForObjects("*")
      ]
    })
    bucket.addToResourcePolicy(rumAllowReadObject)
    /*
     we also need to do the same for kms key
     but to avoid circular dependencies we need to use an escape hatch
     this also does a conditional and if we have a cloudfrontDistributionId
     then it adds the correct policy to allow access from cloudfront
    */

    const contentBucketKmsKey = (kmsKey.node.defaultChild as CfnKey)
    contentBucketKmsKey.keyPolicy = new AllowCloudfrontKmsKeyAccessPolicy(
      this, "StaticContentBucketAllowCloudfrontKmsKeyAccessPolicy", {
        cloudfrontDistributionId: props.cloudfrontDistributionId,
        deploymentRole: props.deploymentRole
      }).policyJson

    /* As you cannot modify imported policies, cdk cannot not update the s3 bucket with the correct permissions
    for OAC when the distribution and bucket are in different stacks
    !! This can only be added after the distribution has been deployed !! */
    if (props.cloudfrontDistributionId){
      bucket.addToResourcePolicy(new AllowCloudfrontGetObjectPolicyStatement(
        this, "StaticContentBucketAllowCloudfrontGetObjectPolicyStatement", {
          bucket: bucket,
          cloudfrontDistributionId: props.cloudfrontDistributionId
        }).policyStatement)

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
