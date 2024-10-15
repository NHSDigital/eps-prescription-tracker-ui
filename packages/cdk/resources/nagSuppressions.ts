import * as cdk from "aws-cdk-lib"
import {NagPackSuppression, NagSuppressions} from "cdk-nag"

function nagSuppressions(stack: cdk.Stack, deployedStackName: string | undefined) {
  // All cdk-nag suppressions should go in here with a reason so we have them in a central place
  // and we know why we have added them

  safeAddNagSuppression(
    stack,
    "/ClinicalPrescriptionTrackerStack/Cognito/RestApiGatewayResources/RestApiGateway/Resource", [
      {
        id: "AwsSolutions-APIG2",
        reason: "Suppress error for not implementing validation"
      }
    ])
  safeAddNagSuppression(stack,
    "/ClinicalPrescriptionTrackerStack/Cognito/RestApiGatewayResources/RestApiGateway/DeploymentStage.prod/Resource",
    [
      {
        id: "AwsSolutions-APIG3",
        reason: "Suppress warning for not implementing WAF"
      },
      {
        id: "AwsSolutions-APIG6",
        reason: "Suppress error for not implementing cloudwatch logging as we do have it enabled"
      }
    ])
  safeAddNagSuppression(
    stack,
    "/ClinicalPrescriptionTrackerStack/Apis/RestApiGatewayResources/RestApiGateway/Resource", [
      {
        id: "AwsSolutions-APIG2",
        reason: "Suppress error for not implementing validation"
      }
    ])
  safeAddNagSuppression(stack,
    "/ClinicalPrescriptionTrackerStack/Apis/RestApiGatewayResources/RestApiGateway/DeploymentStage.prod/Resource",
    [
      {
        id: "AwsSolutions-APIG3",
        reason: "Suppress warning for not implementing WAF"
      },
      {
        id: "AwsSolutions-APIG6",
        reason: "Suppress error for not implementing cloudwatch logging as we do have it enabled"
      }
    ])

  safeAddNagSuppression(stack,
    "/ClinicalPrescriptionTrackerStack/Cognito/UserPool/Resource",
    [
      {
        id: "AwsSolutions-COG1",
        reason: "Suppress error for password policy as we don't use passwords"
      },
      {
        id: "AwsSolutions-COG2",
        reason: "Suppress warning for MFA policy as we don't use passwords"
      },
      {
        id: "AwsSolutions-COG3",
        reason: "Suppress error for advanced security features"
      }
    ])

  safeAddNagSuppression(stack,
    "/ClinicalPrescriptionTrackerStack/Cognito/RestApiGatewayResources/RestApiGateway/Default/token/POST/Resource",
    [
      {
        id: "AwsSolutions-APIG4",
        reason: "Suppress error for not implementing authorization as we don't need it"
      },
      {
        id: "AwsSolutions-COG4",
        reason: "Suppress error for not implementing cognito authorization as we don't need it"
      }
    ])

  safeAddNagSuppression(stack,
    "/ClinicalPrescriptionTrackerStack/Cognito/RestApiGatewayResources/RestApiGateway/Default/mockToken/POST/Resource",
    [
      {
        id: "AwsSolutions-APIG4",
        reason: "Suppress error for not implementing authorization as we don't need it"
      },
      {
        id: "AwsSolutions-COG4",
        reason: "Suppress error for not implementing cognito authorization as we don't need it"
      }
    ])

  safeAddNagSuppression(stack,
    "/ClinicalPrescriptionTrackerStack/Cognito/RestApiGatewayResources/RestApiGateway/Default/jwks/GET/Resource",
    [
      {
        id: "AwsSolutions-APIG4",
        reason: "Suppress error for not implementing authorization as we don't need it"
      },
      {
        id: "AwsSolutions-COG4",
        reason: "Suppress error for not implementing cognito authorization as we don't need it"
      }
    ])

  safeAddNagSuppression(stack,
    "/ClinicalPrescriptionTrackerStack/Tables/TokenMappingResources/TableReadManagedPolicy/Resource",
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard reading indexes"
      }
    ])

  safeAddNagSuppression(stack,
    "/ClinicalPrescriptionTrackerStack/Tables/TokenMappingResources/TableWriteManagedPolicy/Resource",
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard writing indexes"
      }
    ])
  safeAddNagSuppression(stack,
    `/ClinicalPrescriptionTrackerStack/Cognito/TokenResources/Execute${deployedStackName}-tokenManagedPolicy/Resource`,
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard on log stream"
      }
    ])
  safeAddNagSuppression(stack,
    // eslint-disable-next-line max-len
    `/ClinicalPrescriptionTrackerStack/Functions/StatusResources/Execute${deployedStackName}-statusManagedPolicy/Resource`,
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard on log stream"
      }
    ])
  safeAddNagSuppression(stack,
    `/ClinicalPrescriptionTrackerStack/Cognito/JwksResources/Execute${deployedStackName}-jwksManagedPolicy/Resource`,
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard on log stream"
      }
    ])
  safeAddNagSuppression(stack,
    // eslint-disable-next-line max-len
    `/ClinicalPrescriptionTrackerStack/Cognito/MockTokenResources/Execute${deployedStackName}-mockTokenManagedPolicy/Resource`,
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard on log stream"
      }
    ])

}

function safeAddNagSuppression(stack: cdk.Stack, path: string, suppressions: Array<NagPackSuppression>) {
  try {
    NagSuppressions.addResourceSuppressionsByPath( stack, path, suppressions)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch(_) {
    console.log(`Could not find path ${path}`)
  }

}
export {
  nagSuppressions
}
