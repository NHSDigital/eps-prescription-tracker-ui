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
import {AccountRootPrincipal, PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam"

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

    const cloudfrontDistributionId = this.node.tryGetContext("cloudfrontDistributionId")

    // S3 Static Content Bucket
    const staticContentBucket = new StaticContentBucket(this, "StaticContentBucket")

    if (cloudfrontDistributionId !== "") {
      staticContentBucket.bucket.addToResourcePolicy( new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [staticContentBucket.bucket.arnForObjects("*")],
        principals: [ new ServicePrincipal("cloudfront.amazonaws.com")],
        conditions: {
          StringEquals: {
            // eslint-disable-next-line max-len
            "AWS:SourceArn": `arn:aws:cloudfront::${new AccountRootPrincipal().accountId}:distribution/${cloudfrontDistributionId}`
          }
        }
      }))

      staticContentBucket.kmsKey.addToResourcePolicy(new PolicyStatement({
        actions: ["kms:Decrypt"],
        resources: [staticContentBucket.kmsKey.keyArn],
        principals: [ new ServicePrincipal("cloudfront.amazonaws.com")],
        conditions: {
          StringEquals: {
            // eslint-disable-next-line max-len
            "AWS:SourceArn": `arn:aws:cloudfront::${new AccountRootPrincipal().accountId}:distribution/${cloudfrontDistributionId}`
          }
        }
      }))
    }

    // Outputs
    this.staticContentBucket = staticContentBucket.bucket
    this.staticContentBucketKmsKey = staticContentBucket.kmsKey

    // Exports
    new CfnOutput(this, "StaticContentBucketArn", {
      value: staticContentBucket.bucket.bucketArn,
      exportName: `${props.stackName}:StaticContentBucket:Arn`
    })
    new CfnOutput(this, "staticContentBucketKmsKey", {
      value: staticContentBucket.kmsKey.keyArn,
      exportName: `${props.stackName}:staticContentBucketKmsKey:Arn`
    })
    nagSuppressions(this, props.stackName)
  }
}
