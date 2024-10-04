import * as cdk from "aws-cdk-lib"
import {NagSuppressions} from "cdk-nag"

function nagSuppressions(stack: cdk.Stack) {
  // All cdk-nag suppressions should go in here with a reason so we have them in a central place
  // and we know why we have added them

  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    "/ClinicalPrescriptionTrackerStack/Cognito/RestApiGatewayResources/RestApiGateway/Resource", [
      {
        id: "AwsSolutions-APIG2",
        reason: "Suppress error for not implementing validation"
      }
    ])
  NagSuppressions.addResourceSuppressionsByPath(stack,
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
  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    "/ClinicalPrescriptionTrackerStack/Apis/RestApiGatewayResources/RestApiGateway/Resource", [
      {
        id: "AwsSolutions-APIG2",
        reason: "Suppress error for not implementing validation"
      }
    ])
  NagSuppressions.addResourceSuppressionsByPath(stack,
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

  NagSuppressions.addResourceSuppressionsByPath(stack,
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

  NagSuppressions.addResourceSuppressionsByPath(stack,
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

  NagSuppressions.addResourceSuppressionsByPath(stack,
    "/ClinicalPrescriptionTrackerStack/Tables/TokenMappingResources/TableReadManagedPolicy/Resource",
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard reading indexes"
      }
    ])

  NagSuppressions.addResourceSuppressionsByPath(stack,
    "/ClinicalPrescriptionTrackerStack/Tables/TokenMappingResources/TableWriteManagedPolicy/Resource",
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard writing indexes"
      }
    ])
  NagSuppressions.addResourceSuppressionsByPath(stack,
    "/ClinicalPrescriptionTrackerStack/Cognito/TokenResources/Executeclinical-tracker-ui-tokenManagedPolicy/Resource",
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard on log stream"
      }
    ])
  NagSuppressions.addResourceSuppressionsByPath(stack,
    // eslint-disable-next-line max-len
    "/ClinicalPrescriptionTrackerStack/Functions/StatusResources/Executeclinical-tracker-ui-statusManagedPolicy/Resource",
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "Suppress error for wildcard on log stream"
      }
    ])

}

export {
  nagSuppressions
}
