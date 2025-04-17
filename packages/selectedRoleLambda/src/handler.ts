import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  getExistingApigeeAccessToken,
  initializeOidcConfig
} from "@cpt-ui-common/authFunctions"
import {updateDynamoTable, fetchUserRolesFromDynamoDB} from "./selectedRoleHelpers"

/**
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
const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]

// Default error response body for internal system errors
const errorResponseBody = {message: "A system error has occurred"}

// Custom error handler for handling unexpected errors in the Lambda function
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
const jwtKid = process.env["jwtKid"] as string

const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

/**
 * Lambda function handler for updating a user's selected role.
 */
const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  // Extract username from the event
  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  // Verify mock mode settings
  if (isMockToken && MOCK_MODE_ENABLED !== "true") {
    throw new Error("Trying to use a mock user when mock mode is disabled")
  }

  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken
  const apigeeTokenEndpoint = isMockRequest ? mockOidcConfig.oidcTokenEndpoint : cis2OidcConfig.oidcTokenEndpoint
  const oidcConfig = isMockRequest ? mockOidcConfig : cis2OidcConfig
  const axiosInstance = axios.create()

  logger.info("Is this a mock request?", {isMockRequest})
  logger.info("oidc config:", {oidcConfig})

  // Authentication flow
  let apigeeAccessToken: string | undefined
  let cis2IdToken: string | undefined

  // For mock mode - check if we already have a valid token
  if (isMockRequest) {
    logger.info("Mock mode detected, checking for existing Apigee token")
    const existingToken = await getExistingApigeeAccessToken(
      documentClient,
      tokenMappingTableName,
      username,
      logger
    )

    if (existingToken) {
      // Use existing token if valid
      logger.info("Using existing Apigee access token in mock mode")
      apigeeAccessToken = existingToken.accessToken
      cis2IdToken = existingToken.idToken
    }
  }

  // If we don't have a valid token yet, go through the token exchange flow
  if (!apigeeAccessToken) {
    logger.info(`Obtaining new Apigee token (${isMockRequest ? "mock" : "real"} mode)`)

    // Get CIS2 tokens
    const tokensResult = await fetchAndVerifyCIS2Tokens(
      event,
      documentClient,
      logger,
      oidcConfig
    )

    cis2IdToken = tokensResult.cis2IdToken
    logger.debug("Successfully fetched CIS2 tokens", {
      cis2AccessToken: tokensResult.cis2AccessToken,
      cis2IdToken
    })

    // Fetch the private key for signing the client assertion
    logger.info("Accessing JWT private key from Secrets Manager to create signed client assertion")
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
    if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
      throw new Error("Invalid or missing JWT private key")
    }

    // Construct a new body with the signed JWT client assertion
    const requestBody = constructSignedJWTBody(
      logger,
      apigeeTokenEndpoint,
      jwtPrivateKey,
      apigeeApiKey,
      jwtKid,
      cis2IdToken
    )

    // Exchange token with Apigee
    const tokenResult = await exchangeTokenForApigeeAccessToken(
      axiosInstance,
      apigeeTokenEndpoint,
      requestBody,
      logger
    )

    // Update DynamoDB with the new Apigee access token
    await updateApigeeAccessToken(
      documentClient,
      tokenMappingTableName,
      username,
      tokenResult.accessToken,
      tokenResult.expiresIn,
      logger,
      cis2IdToken
    )

    apigeeAccessToken = tokenResult.accessToken
  }

  // Validate the presence of request body
  if (!event.body) {
    logger.warn("Request body is missing", {username})
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
    username,
    selectedRoleFromRequest: userInfoSelectedRole.currently_selected_role ?? "No role provided"
  })

  // Fetch current roles and selected role from DynamoDB
  logger.info("Fetching user roles from DynamoDB", {
    username,
    tableName: tokenMappingTableName
  })

  const cachedRolesWithAccess = await fetchUserRolesFromDynamoDB(
    username,
    documentClient,
    logger,
    tokenMappingTableName
  )

  // Extract rolesWithAccess and currentlySelectedRole from the DynamoDB response
  const rolesWithAccess = cachedRolesWithAccess?.rolesWithAccess || []
  const currentSelectedRole = cachedRolesWithAccess?.currentlySelectedRole // Could be undefined

  // Identify the new selected role from request
  const userSelectedRoleId = userInfoSelectedRole.currently_selected_role?.role_id
  const newSelectedRole = rolesWithAccess.find(role => role.role_id === userSelectedRoleId)

  // Log extracted role details
  logger.info("Extracted role data", {
    username,
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
    username,
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
    username,
    updatedUserInfo
  })

  // Persist changes to DynamoDB
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
