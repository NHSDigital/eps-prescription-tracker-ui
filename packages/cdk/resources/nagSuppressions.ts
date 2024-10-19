/* eslint-disable max-len */

import * as cdk from "aws-cdk-lib"
import {NagPackSuppression, NagSuppressions} from "cdk-nag"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function nagSuppressions(stack: cdk.Stack, deployedStackName: string | undefined) {
  // All cdk-nag suppressions should go in here with a reason so we have them in a central place
  // and we know why we have added them

  safeAddNagSuppression(
    stack,
    "/SharedResourcesStack/StaticContentBucket/deploymentRole/PolicySharedResourcesStackStaticContentBucketdeploymentRole5949E029/Resource", [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard"
      }
    ])
  safeAddNagSuppression(
    stack,
    "/CloudfrontStack/cloudfrontAuditBucket/Bucket/Resource", [
      {
        id: "AwsSolutions-S1",
        reason: "The S3 Bucket has server access logs disabled. This is fine as its the audit log bucket for cloudfront requests"
      }
    ])
}
function safeAddNagSuppression(stack: cdk.Stack, path: string, suppressions: Array<NagPackSuppression>) {
  try {
    NagSuppressions.addResourceSuppressionsByPath(stack, path, suppressions)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch(_) {
    console.log(`Could not find path ${path}`)
  }

}
export {
  nagSuppressions
}
