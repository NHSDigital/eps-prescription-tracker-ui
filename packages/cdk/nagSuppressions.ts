/* eslint-disable max-len */

import {Stack} from "aws-cdk-lib"
import {NagPackSuppression, NagSuppressions} from "cdk-nag"

export const nagSuppressions = (stack: Stack) => {
  if (stack.artifactId === "StatefulStack") {
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

    safeAddNagSuppression(
      stack,
      "/StatefulStack/DynamoDB/TokenMappingResources/TableReadManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for wildcards in policy. This policy is to allow access to all indexes so needs a wildcard"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatefulStack/DynamoDB/TokenMappingResources/TableWriteManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for wildcards in policy. This policy is to allow access to all indexes so needs a wildcard"
        }
      ]
    )

  }

  if (stack.artifactId === "StatelessStack") {
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

    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiGateway/ApiGateway/Default/token/POST/Resource",
      [
        {
          id: "AwsSolutions-APIG4",
          reason: "Suppress error for not implementing authorization. Token endpoint should not have an authorizer"
        },
        {
          id: "AwsSolutions-COG4",
          reason: "Suppress error for not implementing a Cognito user pool authorizer. Token endpoint should not have an authorizer"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiGateway/ApiGateway/Default/mocktoken/POST/Resource",
      [
        {
          id: "AwsSolutions-APIG4",
          reason: "Suppress error for not implementing authorization. Token endpoint should not have an authorizer"
        },
        {
          id: "AwsSolutions-COG4",
          reason: "Suppress error for not implementing a Cognito user pool authorizer. Token endpoint should not have an authorizer"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiGateway/ApiGateway/Default/mocknoauth/GET/Resource",
      [
        {
          id: "AwsSolutions-APIG4",
          reason: "Suppress error for not implementing authorization. Token endpoint should not have an authorizer"
        },
        {
          id: "AwsSolutions-COG4",
          reason: "Suppress error for not implementing a Cognito user pool authorizer. Token endpoint should not have an authorizer"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/CognitoFunctions/PrimaryJwtPrivateKey/Resource",
      [
        {
          id: "AwsSolutions-SMG4",
          reason: "Suppress error for not having automatic rotation. This is a false positive - it does have rotation enabled"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/CognitoFunctions/TokenResources/LambdaPutLogsManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having wildcards in permissions. This is a fine as we need to have permissions on all log streams under path"
        }
      ]
    )
    safeAddNagSuppression(
      stack,
      "/StatelessStack/CognitoFunctions/MockTokenResources/LambdaPutLogsManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having wildcards in permissions. This is a fine as we need to have permissions on all log streams under path"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/CognitoFunctions/MockJwtPrivateKey/Resource",
      [
        {
          id: "AwsSolutions-SMG4",
          reason: "Suppress error for not having automatic rotation. This is a false positive - it does have rotation enabled"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiFunctions/PrescriptionSearch/LambdaPutLogsManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having wildcards in permissions. This is a fine as we need to have permissions on all log streams under path"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiFunctions/PrimaryJwtPrivateKey/Resource",
      [
        {
          id: "AwsSolutions-SMG4",
          reason: "Suppress error for not having automatic rotation. This is a false positive - it does have rotation enabled"
        }
      ]
    )
  }
}

const safeAddNagSuppression = (stack: Stack, path: string, suppressions: Array<NagPackSuppression>) => {
  try {
    NagSuppressions.addResourceSuppressionsByPath(stack, path, suppressions)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    console.log(`Could not find path ${path}`)
  }
}
