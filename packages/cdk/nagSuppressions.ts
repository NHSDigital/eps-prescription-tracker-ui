/* eslint-disable max-len */

import {Stack} from "aws-cdk-lib"
import {NagPackSuppression, NagSuppressions} from "cdk-nag"

export const nagSuppressions = (stack: Stack) => {
  if(stack.artifactId === "StatefulStack"){
    safeAddNagSuppression(
      stack,
      "/StatefulStack/Cognito/UserPool/Resource",
      [
        {
          id: "AwsSolutions-COG3",
          reason: "Suppress error for not implementing AdvancedSecurityMode on cognito. We do not need this"
        },
        {
          id: "AwsSolutions-COG1",
          reason: "Suppress error for not implementing password policy. We are using cognito in federated IdP mode so do not need it"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatefulStack/Cognito/UserPoolDomain/CloudFrontDomainName/CustomResourcePolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for wildcard permissions. This is an auto generated one for cognito domain"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatefulStack/AWS679f53fac002430cb0da5b7982bd2287/ServiceRole/Resource",
      [
        {
          id: "AwsSolutions-IAM4",
          reason: "Suppress error for using AWS managed policy. This is an auto generated one for cognito domain"
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch(err){
    console.log(`Could not find path ${path}`)
  }
}
