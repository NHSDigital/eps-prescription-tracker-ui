import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {initializeOidcConfig, authenticateRequest} from "@cpt-ui-common/authFunctions"
import {getTokenMapping, updateTokenMapping} from "@cpt-ui-common/dynamoFunctions"

/**
 * Lambda function for updating the selected role in the DynamoDB table.
 * This function handles incoming API Gateway requests, extracts the username,
 * parses the request body, and updates the user's role in the database.
 */

const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""
const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["APIGEE_API_KEY"] as string
const jwtKid = process.env["jwtKid"] as string
const apigeeApiSecret= process.env["APIGEE_API_SECRET"] as string
const cis2ApigeeTokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string

// Create a DynamoDB client and document client for interacting with the database
const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const logger = new Logger({serviceName: "selectedRole"})
const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

const oidcConfig = MOCK_MODE_ENABLED === "true" ? mockOidcConfig : cis2OidcConfig
const apigeeTokenEndpoint = MOCK_MODE_ENABLED === "true" ? apigeeMockTokenEndpoint : cis2ApigeeTokenEndpoint

/**
 * Lambda function handler for updating a user's selected role.
 */
const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.debug("Environment variables", {env: {
    tokenMappingTableName,
    MOCK_MODE_ENABLED,
    jwtPrivateKeyArn,
    apigeeApiKey,
    jwtKid,
    apigeeApiSecret,
    cis2ApigeeTokenEndpoint,
    apigeeMockTokenEndpoint,
    apigeeTokenEndpoint
  }})

  // Use the authenticateRequest function for authentication
  const authResult = await authenticateRequest(event, documentClient, logger, {
    tokenMappingTableName: tokenMappingTableName,
    jwtPrivateKeyArn,
    apigeeApiKey,
    apigeeApiSecret,
    jwtKid,
    oidcConfig,
    mockModeEnabled: MOCK_MODE_ENABLED === "true",
    apigeeTokenEndpoint
  })

  if (!authResult) {
    logger.error("Authentication failed, no auth result returned")
    return {
      statusCode: 401,
      body: JSON.stringify({message: "Authentication failed"}),
      headers: {"Content-Type": "application/json"}
    }
  }

  // Validate the presence of request body
  if (!event.body) {
    logger.warn("Request body is missing", {username: authResult.username})
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

  logger.info("Received role selection request", {
    username: authResult.username,
    selectedRoleFromRequest: userInfoSelectedRole.currently_selected_role ?? "No role provided"
  })

  // Fetch current roles and selected role from DynamoDB
  logger.info("Fetching user roles from DynamoDB", {
    username: authResult.username,
    tableName: tokenMappingTableName
  })

  const tokenMappingItem = await getTokenMapping(
    documentClient,
    tokenMappingTableName,
    authResult.username,
    logger
  )

  // Extract rolesWithAccess and currentlySelectedRole from the DynamoDB response
  const rolesWithAccess = tokenMappingItem?.rolesWithAccess || []
  const currentSelectedRole = tokenMappingItem?.currentlySelectedRole // Could be undefined

  // Identify the new selected role from request
  const userSelectedRoleId = userInfoSelectedRole.currently_selected_role?.role_id
  const newSelectedRole = rolesWithAccess.find(role => role.role_id === userSelectedRoleId)

  // Log extracted role details
  logger.info("Extracted role data", {
    username: authResult.username,
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

  logger.info("Updated roles list before database update", {
    username: authResult.username,
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
    username: authResult.username,
    updatedUserInfo
  })

  // Persist changes to DynamoDB
  const item = {
    username: authResult.username,
    currentlySelectedRole: updatedUserInfo.currentlySelectedRole || {},
    rolesWithAccess: updatedUserInfo.rolesWithAccess || [],
    selectedRoleId: updatedUserInfo.selectedRoleId || ""
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
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
