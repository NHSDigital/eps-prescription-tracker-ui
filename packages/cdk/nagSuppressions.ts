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
    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatelessStack/ApiGateway/ApiGateway/Resource",
        "/StatelessStack/OAuth2Gateway/ApiGateway/Resource"
      ],
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
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/authorize/GET/Resource",
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/mock-authorize/GET/Resource",
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/callback/GET/Resource",
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/mock-callback/GET/Resource",
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/token/POST/Resource",
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/mocktoken/POST/Resource"
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
      "/StatelessStack/ApiFunctions/CIS2SignOut/LambdaPutLogsManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for wildcard permissions. This suppression is necessary as the Lambda log group requires access to all log streams."
        }
      ]
    )

    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatelessStack/ApiFunctions/TrackerUserInfo/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/MockTrackerUserInfo/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/SelectedRole/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/TokenResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/MockTokenResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/AuthorizeLambdaResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/CallbackLambdaResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/MockCallbackLambdaResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/MockAuthorizeLambdaResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/MockIDPResponseLambdaResources/LambdaPutLogsManagedPolicy/Resource"
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
      "/StatelessStack/OAuth2Functions/MockTokenResources/LambdaPutLogsManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having wildcards in permissions. This is a fine as we need to have permissions on all log streams under path"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/ApiFunctions/PrescriptionList/LambdaPutLogsManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having wildcards in permissions. This is a fine as we need to have permissions on all log streams under path"
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

    safeAddNagSuppression(
      stack,
      "/StatelessStack/Rum/RumAppIdentityPool",
      [
        {
          id: "AwsSolutions-COG7",
          reason: "Suppress error for not having allowing unauthenticed logins. This is by design"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/Rum/unauthenticatedRumRolePolicies/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having allowing wildcard permissions. This is by design"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/Rum/uploadFilePolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having allowing wildcard permissions. This is by design"
        }
      ]
    )
    safeAddNagSuppression(
      stack,
      "/StatelessStack/Rum/uploadRum/LambdaPutLogsManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having allowing wildcard permissions. This is by design"
        }
      ]
    )
    safeAddNagSuppression(
      stack,
      "/StatelessStack/Rum/LambdaPutLogsManagedPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having allowing wildcard permissions. This is by design"
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
