import {
  App,
  Stack,
  StackProps,
  CfnOutput
} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {RestApi} from "aws-cdk-lib/aws-apigateway"
import {UserPoolDomain} from "aws-cdk-lib/aws-cognito"
import {StaticContentBucket} from "../resources/StaticContentBucket"
import {nagSuppressions} from "../resources/nagSuppressions"

export interface SharedResourcesStackProperties extends StackProps {
  readonly stackName: string
  readonly version: string
  readonly logRetentionInDays: number
}

/**
 * Clinical Prescription Tracker UI Shared Resources

 */

export class SharedResourcesStack extends Stack {
  public readonly staticContentBucket: Bucket
  public staticContentBucketKmsKey: Key
  public readonly apiGateway: RestApi
  public readonly cognitoUserPoolDomain: UserPoolDomain

  public constructor(scope: App, id: string, props: SharedResourcesStackProperties) {
    super(scope, id, props)

    // S3 Static Content Bucket
    const staticContentBucket = new StaticContentBucket(this, "StaticContentBucket")

    // Outputs
    this.staticContentBucket = staticContentBucket.bucket
    this.staticContentBucketKmsKey = staticContentBucket.kmsKey

    // Exports
    new CfnOutput(this, "StaticContentBucketArn", {
      value: staticContentBucket.bucket.bucketArn,
      exportName: `${props.stackName}:StaticContentBucket:Arn`
    })
    nagSuppressions(this, props.stackName)
  }
}
