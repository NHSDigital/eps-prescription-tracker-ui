import {Logger} from "@aws-lambda-powertools/logger"
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceFailedResponse,
  CloudFormationCustomResourceSuccessResponse
} from "aws-lambda"
import axios from "axios"

export const sendFailureMessage = async (
  event: CloudFormationCustomResourceEvent,
  logger: Logger
) => {
  const errorResponse: CloudFormationCustomResourceFailedResponse = {
    Status: "FAILED",
    Reason: "Error when updating stack",
    PhysicalResourceId: `RumScriptUploader-${event.StackId}`,
    LogicalResourceId: event.LogicalResourceId,
    RequestId: event.RequestId,
    StackId: event.StackId
  }

  logger.info("Sending failed response", {errorResponse})

  const data = JSON.stringify(errorResponse)
  return axios.put(event.ResponseURL, data, {
    headers: {
      "content-type": "",
      "content-length": data.length
    }
  })
}

export const sendSuccessMessage = async (
  event: CloudFormationCustomResourceEvent,
  logger: Logger
) => {
  const successResponse: CloudFormationCustomResourceSuccessResponse = {
    Status: "SUCCESS",
    Reason: "Uploaded RUM script",
    PhysicalResourceId: `RumScriptUploader-${event.StackId}`,
    LogicalResourceId: event.LogicalResourceId,
    RequestId: event.RequestId,
    StackId: event.StackId
  }

  logger.info("Sending success response", {successResponse})

  const data = JSON.stringify(successResponse)
  return await axios.put(event.ResponseURL, data, {
    headers: {
      "content-type": "",
      "content-length": data.length
    }
  })
}
