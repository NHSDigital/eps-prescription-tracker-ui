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
const errorResponseBody = {message: "A system error has occurred"}

// Custom error handler for handling unexpected errors in the Lambda function
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

/**
 * Lambda function handler for updating a user's selected role.
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

  logger.info("Parsed user role information from request body", {userInfoSelectedRole})

  logger.info("Fetching existing rolesWithAccess from DynamoDB...")
  const cachedRolesWithAccess = await fetchDynamoRolesWithAccess(
    username, documentClient, logger, tokenMappingTableName
  )

  // Extract rolesWithAccess from the DynamoDB response safely
  const rolesWithAccess = cachedRolesWithAccess?.rolesWithAccess || []
  const userSelectedRoleId = userInfoSelectedRole.currently_selected_role?.role_id

  logger.info("User-selected role ID", {role_id: userSelectedRoleId})

  // Extract current `currentlySelectedRole` and new `selectedRole`
  const currentSelectedRole = cachedRolesWithAccess.currentlySelectedRole
  const newSelectedRole = rolesWithAccess.find(role => role.role_id === userSelectedRoleId) // Keep it if not found

  // Create updated role lists
  const updatedRolesWithAccess = [
    ...rolesWithAccess.filter(role => role.role_id !== userSelectedRoleId), // Remove the newly selected role
    ...(currentSelectedRole ? [currentSelectedRole] : []) // Add previous selected role back to rolesWithAccess
  ]

  const updatedUserInfo = {
    // Set the currently selected role to the new selected role
    currentlySelectedRole: newSelectedRole,
    // Remove the selected role from the roles_with_access array
    rolesWithAccess: updatedRolesWithAccess,
    selectedRoleId: userSelectedRoleId
  }

  logger.info("Updating DynamoDB with new selected role", {updatedUserInfo})

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
