/* eslint-disable max-len */

import {Stack} from "aws-cdk-lib"
import {safeAddNagSuppression, safeAddNagSuppressionGroup} from "@nhsdigital/eps-cdk-constructs"

export const nagSuppressions = (stack: Stack, useMockOidc: boolean = false) => {
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
          id: "AwsSolutions-COG2",
          reason: "Suppress warning for not requiring MFA on cognito. We are using cognito in federated IdP mode so do not need it"
        },
        {
          id: "AwsSolutions-COG1",
          reason: "Suppress error for not implementing password policy. We are using cognito in federated IdP mode so do not need it"
        }
      ]
    )

    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatefulStack/DynamoDB/TableReadManagedPolicy/Resource",
        "/StatefulStack/DynamoDB/TableWriteManagedPolicy/Resource",
        "/StatefulStack/DynamoDB/SessionManagementReadManagedPolicy/Resource",
        "/StatefulStack/DynamoDB/SessionManagementWriteManagedPolicy/Resource"
      ],
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for wildcards in policy. This policy is to allow access to all indexes so needs a wildcard"
        }
      ]
    )
    safeAddNagSuppression(
      stack,
      "/StatefulStack/Rum/RumAppIdentityPool",
      [
        {
          id: "AwsSolutions-COG7",
          reason: "Suppress error for not having allowing unauthenticed logins. This is by design"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatefulStack/Rum/unauthenticatedRumRolePolicies/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Suppress error for not having allowing wildcard permissions. This is by design"
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

    const endpointSuppressions = [
      {
        id: "AwsSolutions-APIG4",
        reason: "Suppress error for not implementing authorization. Auth endpoints should not have an authorizer"
      },
      {
        id: "AwsSolutions-COG4",
        reason: "Suppress error for not implementing a Cognito user pool authorizer. Auth endpoints should not have an authorizer"
      }
    ]

    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/oauth2/authorize/GET/Resource",
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/oauth2/callback/GET/Resource",
        "/StatelessStack/OAuth2Gateway/ApiGateway/Default/oauth2/token/POST/Resource"
      ],
      endpointSuppressions
    )

    if (useMockOidc) {
      safeAddNagSuppressionGroup(
        stack,
        [
          "/StatelessStack/OAuth2Gateway/ApiGateway/Default/oauth2/mock-authorize/GET/Resource",
          "/StatelessStack/OAuth2Gateway/ApiGateway/Default/oauth2/mock-callback/GET/Resource",
          "/StatelessStack/OAuth2Gateway/ApiGateway/Default/oauth2/mock-token/POST/Resource",
          "/StatelessStack/ApiGateway/ApiGateway/Default/api/test-support-clear-active-session/POST/Resource",
          "/StatelessStack/ApiGateway/ApiGateway/Default/api/test-support-fake-timer/POST/Resource"
        ],
        endpointSuppressions
      )
    }

    const lambdaLogPolicySuppressions = [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for not having wildcards in permissions. This is a fine as we need to have permissions on all log streams under path"
      }
    ]

    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatelessStack/ApiFunctions/CIS2SignOut/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/TrackerUserInfo/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/SelectedRole/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/PatientSearch/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/PrescriptionList/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/PrescriptionDetails/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/ApiFunctions/SessionMgmt/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/TokenResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/AuthorizeLambdaResources/LambdaPutLogsManagedPolicy/Resource",
        "/StatelessStack/OAuth2Functions/CallbackLambdaResources/LambdaPutLogsManagedPolicy/Resource"
      ],
      lambdaLogPolicySuppressions
    )

    if (useMockOidc) {
      safeAddNagSuppressionGroup(
        stack,
        [
          "/StatelessStack/ApiFunctions/ClearActiveSessions/LambdaPutLogsManagedPolicy/Resource",
          "/StatelessStack/ApiFunctions/SetLastActivityTimer/LambdaPutLogsManagedPolicy/Resource",
          "/StatelessStack/OAuth2Functions/MockTokenResources/LambdaPutLogsManagedPolicy/Resource",
          "/StatelessStack/OAuth2Functions/MockCallbackLambdaResources/LambdaPutLogsManagedPolicy/Resource",
          "/StatelessStack/OAuth2Functions/MockAuthorizeLambdaResources/LambdaPutLogsManagedPolicy/Resource"
        ],
        lambdaLogPolicySuppressions
      )
    }

    const secretSuppressions = [
      {
        id: "AwsSolutions-SMG4",
        reason: "Suppress error for not rotating secret. This is by design."
      }
    ]

    safeAddNagSuppressionGroup(
      stack,
      [
        "/StatelessStack/SharedSecrets/PrimaryJwtPrivateKey/Resource",
        "/StatelessStack/SharedSecrets/ApigeeApiKeySecret/Resource",
        "/StatelessStack/SharedSecrets/ApigeeSecretKeySecret/Resource",
        "/StatelessStack/SharedSecrets/ApigeeDoHSApiKeySecret/Resource"
      ],
      secretSuppressions
    )

    if (useMockOidc) {
      safeAddNagSuppression(
        stack,
        "/StatelessStack/SharedSecrets/MockJwtPrivateKey/Resource",
        secretSuppressions
      )
    }

    safeAddNagSuppression(
      stack,
      "/StatelessStack/CloudfrontDistribution/CloudfrontDistribution/Resource",
      [
        {
          id: "AwsSolutions-CFR3",
          reason: "Suppress error for not having access logging. We send logs to cloudwatch instead of S3"
        }
      ]
    )

    safeAddNagSuppression(
      stack,
      "/StatelessStack/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/Resource",
      [{
        id: "AwsSolutions-L1",
        reason: "CDK creates Python 3.13 lambdas for custom resources but Python 3.14 is now available. This can be removed once CDK updates to Python 3.14 runtimes."
      }]
    )
  }
}
