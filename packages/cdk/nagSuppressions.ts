/* eslint-disable max-len */

import {Stack} from "aws-cdk-lib"
import {NagPackSuppression, NagSuppressions} from "cdk-nag"

export const nagSuppressions = (stack: Stack) => {
  if(stack.artifactId === "StatefulStack"){
    safeAddNagSuppression(
      stack,
      "/StatefulStack/StaticContentBucket/deploymentRole/PolicyStatefulStackStaticContentBucketdeploymentRoleACB59A57/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for wildcards in Bucket/KMS key policy. This applies only to the current Bucket/KMS key so is safe"
        }
      ]
    )
  }

  if(stack.artifactId === "StatelessStack"){
    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiGateway/ApiGateway/Resource",
      [
        {
          id: "AwsSolutions-APIG2",
          reason: "Suppress error for request validation not being enabled. Validation will be handled by the service logic."
        }
      ]
    )

    // !! Remove after auth has been implemented !!
    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiGateway/ApiGateway/Default/ANY/Resource",
      [
        {
          id: "AwsSolutions-APIG4",
          reason: "Suppress error for not implementing authorization. Authorizer will be added after cognito is implemented"
        }
      ]
    )

    // !! Remove after auth has been implemented !!
    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiGateway/ApiGateway/Default/ANY/Resource",
      [
        {
          id: "AwsSolutions-COG4",
          reason: "Suppress error for not implementing a Cognito user pool authorizer. Authorizer will be added after cognito is implemented"
        }
      ]
    )
  }
}

const safeAddNagSuppression = (stack: Stack, path: string, suppressions: Array<NagPackSuppression>) => {
  try {
    NagSuppressions.addResourceSuppressionsByPath(stack, path, suppressions)

  } catch(err){
    console.log(`Could not find path ${path}`)
    console.log(err)
  }
}
