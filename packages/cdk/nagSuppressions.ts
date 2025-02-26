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
      "/StatefulStack/AWS679f53fac002430cb0da5b7982bd2287/Resource",
      [
        {
          id: "AwsSolutions-L1",
          reason: "AWS supplied lambda does not use latest runtime"
        }
      ]
    )

    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatefulStack/DynamoDB/TableReadManagedPolicy/Resource",
        "/StatefulStack/DynamoDB/TableWriteManagedPolicy/Resource",
        "/StatefulStack/DynamoDB/StateTableReadManagedPolicy/Resource",
        "/StatefulStack/DynamoDB/StateTableWriteManagedPolicy/Resource"
      ],
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
      "/StatelessStack/SharedSecrets/GetRandomPasswordPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for having a wildcard in the GetRandomPasswordPolicy. Cant apply this to the specific ARN"
        }
      ]
    )

    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatelessStack/ApiGateway/ApiGateway/Default/oauth2/authorize/GET/Resource",
        "/StatelessStack/ApiGateway/ApiGateway/Default/oauth2/mockauthorize/GET/Resource",
        "/StatelessStack/ApiGateway/ApiGateway/Default/oauth2/callback/GET/Resource",
        "/StatelessStack/ApiGateway/ApiGateway/Default/oauth2/mockcallback/GET/Resource",
        "/StatelessStack/ApiGateway/ApiGateway/Default/token/POST/Resource",
        "/StatelessStack/ApiGateway/ApiGateway/Default/mocktoken/POST/Resource",
        "/StatelessStack/ApiGateway/ApiGateway/Default/mocknoauth/GET/Resource"
      ],
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

    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatelessStack/ApiFunctions/TrackerUserInfo/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/MockTrackerUserInfo/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/SelectedRole/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/CognitoFunctions/TokenResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/CognitoFunctions/MockTokenResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/CognitoFunctions/AuthorizeLambdaResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/CognitoFunctions/MockAuthorizeLambdaResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/CognitoFunctions/IDPResponseLambdaResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/CognitoFunctions/MockIDPResponseLambdaResources/LambdaPutLogsManagedPolicy/Resource"
      ],
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
      "/StatelessStack/SharedSecrets/PrimaryJwtPrivateKey/Resource",
      [
        {
          id: "AwsSolutions-SMG4",
          reason: "Suppress error for not having automatic rotation. This is a false positive - it does have rotation enabled"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/SharedSecrets/MockJwtPrivateKey/Resource",
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

// Apply the same nag suppression to multiple resources
const safeAddNagSuppressionGroup = (stack: Stack, path: Array<string>, suppressions: Array<NagPackSuppression>) => {
  for (const p of path) {
    safeAddNagSuppression(stack, p, suppressions)
  }
}
