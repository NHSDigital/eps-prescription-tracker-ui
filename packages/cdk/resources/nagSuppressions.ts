/* eslint-disable max-len */

import * as cdk from "aws-cdk-lib"
import {NagPackSuppression, NagSuppressions} from "cdk-nag"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function nagSuppressions(stack: cdk.Stack, deployedStackName: string | undefined) {
  // All cdk-nag suppressions should go in here with a reason so we have them in a central place
  // and we know why we have added them

  safeAddNagSuppression(
    stack,
    "/BackendStack/StatusResources/LambdaPutLogsManagedPolicy/Resource", [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard"
      }
    ])

  safeAddNagSuppression(
    stack,
    "/CloudfrontStack/CloudfrontDistribution/Resource", [
      {
        id: "AwsSolutions-CFR2",
        reason: "foo"
      }
    ])
  safeAddNagSuppression(
    stack,
    "/CloudfrontStack/CloudfrontDistribution/Bucket", [
      {
        id: "AwsSolutions-CFR1",
        reason: "foo"
      }
    ])

  safeAddNagSuppression(
    stack,
    "/CloudfrontStack/StaticContentBucket/deploymentRole/PolicyCloudfrontStackStaticContentBucketdeploymentRoleDED1B723/Resource", [
      {
        id: "AwsSolutions-IAM5",
        reason: "foo"
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
