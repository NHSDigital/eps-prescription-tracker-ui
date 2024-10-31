import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {Effect, PolicyStatement, Role} from "aws-cdk-lib/aws-iam"
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

import {AllowCloudfrontGetObjectPolicyStatement} from "../policies/s3/AllowCloudfrontGetObjectPolicyStatement"
import {AllowCloudfrontKmsKeyAccessPolicy} from "../policies/kms/AllowCloudfrontKmsKeyAccessPolicy"

export interface StaticContentBucketProps {
  bucketName: string
}

/**
 * Resources for a static content S3 bucket

 */

export class StaticContentBucket extends Construct{
  public readonly bucket: Bucket
  public kmsKey: Key

  public constructor(scope: Construct, id: string, props: StaticContentBucketProps){
    super(scope, id)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const allowAutoDeleteObjects: boolean = this.node.tryGetContext("allowAutoDeleteObjects") === "true"
    const cloudfrontDistributionId: string = this.node.tryGetContext("cloudfrontDistributionId")

    // Imports
    const auditLoggingBucket = Bucket.fromBucketArn(
      this, "AuditLoggingBucket", Fn.importValue("account-resources:AuditLoggingBucket"))

    const deploymentRole = Role.fromRoleArn(
      this, "deploymentRole", Fn.importValue("ci-resources:CloudFormationDeployRole"))

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
      serverAccessLogsBucket: auditLoggingBucket,
      serverAccessLogsPrefix: "/static-content",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: allowAutoDeleteObjects // if true forces a deletion even if bucket is not empty
    })

    const bucketAllowDeployUploadPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [deploymentRole],
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
      resources: [bucket.arnForObjects("*")]
    })

    const kmsAllowDeployUsePolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [deploymentRole],
      actions: [
        "kms:Encrypt",
        "kms:GenerateDataKey*"
      ],
      resources: [kmsKey.keyArn]
    })

    bucket.addToResourcePolicy(bucketAllowDeployUploadPolicyStatement)
    kmsKey.addToResourcePolicy(kmsAllowDeployUsePolicyStatement)

    /* As you cannot modify imported policies, cdk cannot not update the s3 bucket with the correct permissions
    for OAC when the distribution and bucket are in different stacks
    !! This can only be added after the distribution has been deployed !! */
    if (cloudfrontDistributionId){
      bucket.addToResourcePolicy(new AllowCloudfrontGetObjectPolicyStatement(
        this, "StaticContentBucketAllowCloudfrontGetObjectPolicyStatement", {
          bucket: bucket,
          cloudfrontDistributionId: cloudfrontDistributionId
        }).policyStatement)

      /* When using an s3 origin with OAC and SSE, cdk will use a wildcard in the generated Key policy condition
      to match all Distribution IDs in order to avoid a circular dependency between the KMS key,Bucket, and
      Distribution during the initial deployment. This updates the policy to restrict it to a specific distribution.
      !! This can only be added after the distribution has been deployed !! */
      const contentBucketKmsKey = (kmsKey.node.defaultChild as CfnKey)
      const existingPolicy = contentBucketKmsKey.keyPolicy.toJSON()
      contentBucketKmsKey.keyPolicy = new AllowCloudfrontKmsKeyAccessPolicy(
        this, "StaticContentBucketAllowCloudfrontKmsKeyAccessPolicy", {
          cloudfrontDistributionId: cloudfrontDistributionId,
          deploymentRole: deploymentRole,
          existingPolicy: existingPolicy
        }).policyJson
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
