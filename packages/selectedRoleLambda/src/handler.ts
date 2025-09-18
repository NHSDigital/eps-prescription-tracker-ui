import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import axios from "axios"
import inputOutputLogger from "@middy/input-output-logger"
import httpHeaderNormalizer from "@middy/http-header-normalizer"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {authenticationMiddleware, authParametersFromEnv, AuthResult} from "@cpt-ui-common/authFunctions"
import {getTokenMapping, updateTokenMapping} from "@cpt-ui-common/dynamoFunctions"
import {extractInboundEventValues, appendLoggerKeys} from "@cpt-ui-common/lambdaUtils"

/**
 * Lambda function for updating the selected role in the DynamoDB table.
 * This function handles incoming API Gateway requests, extracts the username,
 * parses the request body, and updates the user's role in the database.
 */

// Create a DynamoDB client and document client for interacting with the database
const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const axiosInstance = axios.create()

const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const logger = new Logger({serviceName: "selectedRole"})

const authenticationParameters = authParametersFromEnv()
const tokenMappingTableName = authenticationParameters.tokenMappingTableName

/**
 * Lambda function handler for updating a user's selected role.
 */
const lambdaHandler = async (event: APIGatewayProxyEventBase<AuthResult>): Promise<APIGatewayProxyResult> => {
  const {loggerKeys} = extractInboundEventValues(event)
  appendLoggerKeys(logger, loggerKeys)

  // Validate the presence of request body
  if (!event.body) {
    logger.warn("Request body is missing")
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

  const username = event.requestContext.authorizer.username

  logger.info("Received role selection request", {
    username,
    selectedRoleFromRequest: userInfoSelectedRole.currently_selected_role ?? "No role provided"
  })

  const tokenMappingItem = await getTokenMapping(
    documentClient,
    tokenMappingTableName,
    username,
    logger
  )

  // Extract rolesWithAccess and currentlySelectedRole from the DynamoDB response
  const rolesWithAccess = tokenMappingItem?.rolesWithAccess || []
  const currentSelectedRole = tokenMappingItem?.currentlySelectedRole // Could be undefined

  // Identify the new selected role from request
  const userSelectedRoleId = userInfoSelectedRole.currently_selected_role?.role_id
  const newSelectedRole = rolesWithAccess.find(role => role.role_id === userSelectedRoleId)

  // Log extracted role details
  logger.debug("Extracted role data", {
    username: username,
    rolesWithAccessCount: rolesWithAccess.length,
    rolesWithAccess: rolesWithAccess.map(role => ({
      role_id: role.role_id,
      role_name: role.role_name,
      org_code: role.org_code
    })),
    previousSelectedRole: currentSelectedRole
      ? {
        role_id: currentSelectedRole.role_id,
        role_name: currentSelectedRole.role_name,
        org_code: currentSelectedRole.org_code
      }
      : "No previous role selected",
    newSelectedRole: newSelectedRole
      ? {
        role_id: newSelectedRole.role_id,
        role_name: newSelectedRole.role_name,
        org_code: newSelectedRole.org_code
      }
      : "Role not found in rolesWithAccess"
  })

  // Construct updated roles list
  const updatedRolesWithAccess = [
    ...rolesWithAccess.filter(role => role.role_id !== userSelectedRoleId), // Remove the new selected role

    // Move the previously selected role back into rolesWithAccess, but only if it was set
    ...(currentSelectedRole && Object.keys(currentSelectedRole).length > 0
      ? [currentSelectedRole]
      : [])
  ]

  logger.debug("Updated roles list before database update", {
    username: username,
    newSelectedRole: newSelectedRole
      ? {
        role_id: newSelectedRole.role_id,
        role_name: newSelectedRole.role_name,
        org_code: newSelectedRole.org_code
      }
      : "No role selected",
    returningRoleToAccessList: currentSelectedRole
      ? {
        role_id: currentSelectedRole.role_id,
        role_name: currentSelectedRole.role_name,
        org_code: currentSelectedRole.org_code
      }
      : "No previous role to return",
    updatedRolesWithAccessCount: updatedRolesWithAccess.length,
    updatedRolesWithAccess: updatedRolesWithAccess.map(role => ({
      role_id: role.role_id,
      role_name: role.role_name,
      org_code: role.org_code
    }))
  })

  // Prepare the updated user info to be stored in DynamoDB
  const updatedUserInfo = {
    currentlySelectedRole: newSelectedRole || undefined, // If no role is found, store `undefined`
    rolesWithAccess: updatedRolesWithAccess,
    selectedRoleId: userSelectedRoleId
  }

  logger.info("Updating user role in DynamoDB", {
    username: username,
    updatedUserInfo
  })

  // Persist changes to DynamoDB
  const item = {
    username: username,
    currentlySelectedRole: updatedUserInfo.currentlySelectedRole || {},
    rolesWithAccess: updatedUserInfo.rolesWithAccess || [],
    selectedRoleId: updatedUserInfo.selectedRoleId || "",
    lastActivityTime: Date.now()
  }
  await updateTokenMapping(documentClient, tokenMappingTableName, item, logger)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Selected role data has been updated successfully",
      userInfo: updatedUserInfo
    })
  }
}

export const handler = middy(lambdaHandler)
  .use(authenticationMiddleware({
    axiosInstance,
    ddbClient: documentClient,
    authOptions: authenticationParameters,
    logger
  }))
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(httpHeaderNormalizer())
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
