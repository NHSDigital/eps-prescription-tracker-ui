import {
  App,
  Stack,
  StackProps,
  Fn
} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
  IBucket
} from "aws-cdk-lib/aws-s3"

import {IRestApi} from "aws-cdk-lib/aws-apigateway"

export interface SharedResourcesStackProperties extends StackProps {
  readonly stackName: string
  readonly version: string
}

export class SharedResourcesStack extends Stack {
  public readonly contentBucket: IBucket
  public readonly apiGateway: IRestApi

  public constructor(scope: App, id: string, props: SharedResourcesStackProperties) {
    super(scope, id, props)

    // Imports
    const auditLoggingBucket = Bucket.fromBucketArn(
      this, "AuditLoggingBucket", Fn.importValue("account-resources:AuditLoggingBucket"))

    // S3 Content Bucket
    const contentBucketKmsKey = new Key(this, "ContentBucketKmsKey", {
      enableKeyRotation: true
    })
    contentBucketKmsKey.addAlias("alias/ContentBucketKmsKey")

    const contentBucket = new Bucket(this, "ContentBucket", {
      encryption: BucketEncryption.KMS,
      bucketKeyEnabled: true,
      encryptionKey: contentBucketKmsKey,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsBucket: auditLoggingBucket,
      serverAccessLogsPrefix: "/cpt-content"
    })

    // todo: s3 policy

    // todo: ui backend api gateway resources

    // Outputs
    this.contentBucket = contentBucket

    // Exports
  }
}
