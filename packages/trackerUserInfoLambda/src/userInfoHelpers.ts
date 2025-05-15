import {Logger} from "@aws-lambda-powertools/logger"
import axios, {isAxiosError} from "axios"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {OidcConfig, decodeToken} from "@cpt-ui-common/authFunctions"
import {
  extractRoleInformation,
  UserInfoResponse,
  TrackerUserInfo,
  RoleDetails,
  UserDetails,
  updateTokenMapping,
  getTokenMapping
} from "@cpt-ui-common/dynamoFunctions"
/**
 * **Fetches user information from the OIDC UserInfo endpoint.**
 *
 * - Uses the provided access token to retrieve user roles and details.
 * - Organizes roles into three categories:
 *    - `rolesWithAccess`: Roles that have CPT access.
 *    - `rolesWithoutAccess`: Roles that do not have CPT access.
 *    - `currentlySelectedRole`: The user's currently selected role, if applicable.
 * - Extracts basic user details (`family_name` and `given_name`).
 */
export const fetchUserInfo = async (
  cis2AccessToken: string,
  cis2IdToken: string,
  logger: Logger,
  oidcConfig: OidcConfig
): Promise<TrackerUserInfo> => {

  logger.info("Fetching user info from OIDC UserInfo endpoint", {oidcConfig})

  // Verify and decode cis2IdToken
  const decodedIdToken = decodeToken(cis2IdToken)
  logger.debug("Decoded cis2IdToken", {decodedIdToken})

  // Extract the selected_roleid from the decoded cis2IdToken
  const selectedRoleId = decodedIdToken?.selected_roleid
  logger.info("Selected role ID extracted from cis2IdToken", {selectedRoleId})

  if (!oidcConfig.oidcUserInfoEndpoint) {
    throw new Error("OIDC UserInfo endpoint not set")
  }

  try {
    const response = await axios.get<UserInfoResponse>(
      oidcConfig.oidcUserInfoEndpoint,
      // "https://internal-dev.api.service.nhs.uk/oauth2-mock/userinfo",
      {
        headers: {
          Authorization: `Bearer ${cis2AccessToken}`
        }
      })
    logger.info("User info fetched successfully")

    // Extract the roles from the user info response
    const data: UserInfoResponse = response.data

    return extractRoleInformation(
      data,
      selectedRoleId,
      logger
    )

  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        logger.error("received this response", {respone: error.response})
      }
    }
    logger.error("Error fetching user info", {error})
    throw new Error("Error fetching user info")
  }
}

/**
 * **Updates the user information in DynamoDB.**
 *
 * - Stores `currentlySelectedRole`, `rolesWithAccess`, `rolesWithoutAccess`, and `userDetails`.
 * - Ensures no undefined values are stored in DynamoDB.
 */
export const updateDynamoTable = async (
  username: string,
  data: TrackerUserInfo,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
) => {
  if (tokenMappingTableName === "") {
    throw new Error("Token mapping table name not set")
  }

  logger.debug("Adding user roles to DynamoDB", {username, data})

  // Dynamo cannot allow undefined values. We need to scrub any undefined values from the data objects
  const currentlySelectedRole: RoleDetails = data.currently_selected_role ? data.currently_selected_role : {}
  const rolesWithAccess: Array<RoleDetails> = data.roles_with_access ? data.roles_with_access : []
  const rolesWithoutAccess: Array<RoleDetails> = data.roles_without_access ? data.roles_without_access : []
  const userDetails: UserDetails = data.user_details || {family_name: "", given_name: ""}

  // Since RoleDetails has a bunch of possibly undefined fields, we need to scrub those out.
  // Convert everything to strings, then convert back to a generic object.
  const scrubbedCurrentlySelectedRole = JSON.parse(JSON.stringify(currentlySelectedRole))
  const scrubbedRolesWithAccess = rolesWithAccess.map((role) => JSON.parse(JSON.stringify(role)))
  const scrubbedRolesWithoutAccess = rolesWithoutAccess.map((role) => JSON.parse(JSON.stringify(role)))
  const scrubbedUserDetails = JSON.parse(JSON.stringify(userDetails))

  try {
    const item = {
      username,
      rolesWithAccess: scrubbedRolesWithAccess,
      rolesWithoutAccess: scrubbedRolesWithoutAccess,
      currentlySelectedRole: scrubbedCurrentlySelectedRole,
      userDetails: scrubbedUserDetails
    }
    await updateTokenMapping(documentClient, tokenMappingTableName, item, logger)
    logger.info("User roles added to DynamoDB", {username})
  } catch (error) {
    logger.error("Error adding user roles to DynamoDB", {username, data, error})
    throw error
  }
}

/**
 * **Fetches user information from DynamoDB.**
 *
 * - Retrieves `rolesWithAccess`, `rolesWithoutAccess`, `currentlySelectedRole`, and `userDetails`.
 * - Returns default values for missing attributes.
 */
export const fetchDynamoTable = async (
  username: string,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
): Promise<TrackerUserInfo | null> => {
  logger.info("Fetching user info from DynamoDB", {username})

  try {
    const tokenMappingItem = await getTokenMapping(documentClient, tokenMappingTableName, username, logger)

    // Ensure correct keys are returned
    const mappedUserInfo: TrackerUserInfo = {
      roles_with_access: tokenMappingItem.rolesWithAccess || [],
      roles_without_access: tokenMappingItem.rolesWithoutAccess || [],
      currently_selected_role: tokenMappingItem.currentlySelectedRole || undefined,
      user_details: tokenMappingItem.userDetails || {family_name: "", given_name: ""}
    }

    logger.info("User info successfully retrieved from DynamoDB", {data: mappedUserInfo})
    return mappedUserInfo
  } catch (error) {
    logger.error("Error fetching user info from DynamoDB", {error})
    throw new Error("Failed to retrieve user info from cache")
  }
}
