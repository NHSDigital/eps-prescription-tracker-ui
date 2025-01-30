import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {getUsernameFromEvent} from "@cpt-ui-common/authFunctions"
import {updateDynamoTable, fetchDynamoRolesWithAccess} from "./selectedRoleHelpers"

/*
 * Lambda function for updating the selected role in the DynamoDB table.
 * This function handles incoming API Gateway requests, extracts the username,
 * parses the request body, and updates the user's role in the database.
 */

// Initialize a logger instance for the service
const logger = new Logger({serviceName: "selectedRole"})

// Create a DynamoDB client and document client for interacting with the database
const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Retrieve the table name from environment variables
const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""

// Default error response body for internal system errors
const errorResponseBody = {
  message: "A system error has occurred"
}

// Custom error handler for handling unexpected errors in the Lambda function
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

/**
 * The main handler function for processing API Gateway events.
 * Handles parsing, validation, and updates the selected role in the DynamoDB table.
 */
const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  // Extract username from the event
  const username = getUsernameFromEvent(event)

  // Validate the presence of request body
  if (!event.body) {
    logger.error("Request body is missing")
    return {
      statusCode: 400,
      body: JSON.stringify({message: "Request body is required"})
    }
  }

  // Parse the request body to extract user role information
  let userInfoSelectedRole
  try {
    userInfoSelectedRole = JSON.parse(event.body)
  } catch (error) {
    logger.error("Failed to parse request body", {error})
    return {
      statusCode: 400,
      body: JSON.stringify({message: "Invalid JSON format in request body"})
    }
  }

  logger.info("Fetching existing roles_with_access from DynamoDB...")
  const cachedRolesWithAccess = await fetchDynamoRolesWithAccess(
    username, documentClient, logger, tokenMappingTableName
  )

  logger.info("Roles with access and currently selected role fetched from DynamoDB", {cachedRolesWithAccess})

  // Extract roles_with_access from the response safely
  const rolesWithAccess = cachedRolesWithAccess?.rolesWithAccess || []

  // Find the role selected during event in the roles_with_access array
  const selectedRole = rolesWithAccess.find(
    (role) => role.role_id === userInfoSelectedRole.role_id
  )

  logger.info("The selected role to be moved from rolesWithAccess to currentlySelectedRole in DynamoDB", {selectedRole})

  const updatedUserInfo = {
    // Set the currently selected role to the selected role
    currentlySelectedRole: selectedRole,
    // Remove the selected role from the roles_with_access array
    rolesWithAccess: rolesWithAccess.filter(
      (role) => role.role_id !== userInfoSelectedRole.role_id
    ),
    selectedRoleId: selectedRole?.role_id
  }

  logger.info("Updating selected role data in DynamoDB", {updatedUserInfo})

  // Call helper function to update the selected role in the database
  await updateDynamoTable(username, updatedUserInfo, documentClient, logger, tokenMappingTableName)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Selected role data has been updated successfully",
      userInfo: updatedUserInfo
    })
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
