import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import axios from "axios"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import {
  UserInfo,
  UserInfoResponse,
  RoleInfo,
  NRBACRole
} from "./cis2_token_types"

export const fetchAndVerifyCIS2Tokens = async (
  event: APIGatewayProxyEvent,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
) => {

  logger.info("Fetching and verifying CIS2 tokens")

  const TokenMappingTableName = process.env["TokenMappingTableName"]
  if (!TokenMappingTableName) {
    throw new Error("Token mapping table name not set")
  }

  // Extract tokens from request headers
  const authorizationHeader = event.headers["Authorization"] || event.headers["authorization"]
  if (!authorizationHeader) {
    throw new Error("Authorization header missing")
  }

  // Extract the idToken from the Authorization header
  const idToken = authorizationHeader.replace("Bearer ", "").trim()

  // Decode the idToken, which is a JWT. We need the `cognito:username` claim to fetch the user data from DynamoDB
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username){
    throw new Error("Unable to extract username from ID token")
  }
  logger.info("Extracted username from ID token", {username})

  // Fetch the relevant document from DynamoDB, containing the CIS2 tokens
  let cis2AccessToken
  let cis2IdToken
  let existingData
  try {
    logger.info("Fetching CIS2 access token from DynamoDB")
    const result = await documentClient.send(
      new GetCommand({
        TableName: TokenMappingTableName,
        Key: {username}
      })
    )
    logger.info("DynamoDB response", {result})

    if (result.Item) {
      existingData = result.Item
      cis2AccessToken = existingData.CIS2_accessToken
      cis2IdToken = existingData.CIS2_idToken
    } else {
      logger.error("CIS2 access token not found for user")
      throw new Error("CIS2 access token not found for user")
    }
  } catch (error) {
    logger.error("Error fetching data from DynamoDB", {error})
    throw new Error("Internal server error while accessing DynamoDB")
  }

  verifyIdToken(idToken, logger)

  return {cis2AccessToken, cis2IdToken}
}

// TODO: Verify the token with CIS2
const verifyIdToken = async (idToken: string, logger: Logger) => {
  const oidcIssuer = process.env["oidcIssuer"]
  if (!oidcIssuer) {
    throw new Error("OIDC issuer not set")
  }
  logger.info("Verifying ID token", {oidcIssuer})

  if (!idToken) {
    throw new Error("ID token not provided")
  }
}

export const fetchUserInfo = async (
  accessToken: string,
  accepted_access_codes: Array<string>,
  selectedRoleId: string | undefined,
  logger: Logger
): Promise<UserInfoResponse> => {
  // Fetch user info from the OIDC UserInfo endpoint
  // The access token is used to identify the user, and fetch their roles.
  // This populates three lists:
  //  - rolesWithAccess: roles that have access to the CPT
  //  - rolesWithoutAccess: roles that don't have access to the CPT
  //  - [OPTIONAL] currentlySelectedRole: the role that is currently selected by the user
  // Each list contains information on the roles, such as the role name, role ID, ODS code, and organization name.

  const oidcUserInfoEndpoint = process.env["userInfoEndpoint"]
  logger.info("Fetching user info from OIDC UserInfo endpoint", {oidcUserInfoEndpoint})

  if (!oidcUserInfoEndpoint) {
    throw new Error("OIDC UserInfo endpoint not set")
  }

  try {
    const response = await axios.get<UserInfo>(oidcUserInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    logger.info("User info fetched successfully", {data: response.data})

    // Extract the roles from the user info response
    const data: UserInfo = response.data

    // These will be our outputs
    const rolesWithAccess: Array<RoleInfo> = []
    const rolesWithoutAccess: Array<RoleInfo> = []
    let currentlySelectedRole: RoleInfo | undefined = undefined

    // Get roles from the user info response
    const roles = data.nhsid_nrbac_roles || []

    roles.forEach((role: NRBACRole) => {
      logger.info("Processing role", {role})
      const activityCodes = role.activity_codes || []

      const hasAccess = activityCodes.some((code: string) => accepted_access_codes.includes(code))
      logger.info("Role CPT access?", {hasAccess})

      const roleInfo: RoleInfo = {
        roleName: role.role_name,
        roleID: role.person_roleid,
        ODS: role.org_code,
        orgName: getOrgNameFromOrgCode(data, role.org_code, logger)
      }

      // Ensure the role has at least one of the required fields
      if (!(roleInfo.roleName || roleInfo.roleID || roleInfo.ODS || roleInfo.orgName)) {
        // Skip roles that don't meet the minimum field requirements
        logger.warn("Role does not meet minimum field requirements", {roleInfo})
        return
      }

      if (hasAccess) {
        rolesWithAccess.push(roleInfo)
      } else {
        rolesWithoutAccess.push(roleInfo)
      }

      // Determine the currently selected role
      logger.info("Checking if role is currently selected", {selectedRoleId, roleID: role.person_roleid, roleInfo})
      if (selectedRoleId && role.person_roleid === selectedRoleId) {
        logger.info("Role is currently selected", {roleID: role.person_roleid, roleInfo})
        if (hasAccess) {
          logger.info("Role has access; setting as currently selected", {roleInfo})
          currentlySelectedRole = roleInfo
        } else {
          logger.info("Role does not have access; unsetting currently selected role", {roleInfo})
          currentlySelectedRole = undefined
        }
      }
    })

    const result: UserInfoResponse = {
      rolesWithAccess,
      rolesWithoutAccess,
      currentlySelectedRole
    }

    logger.info("Returning user info response", {result})
    return result
  } catch (error) {
    logger.error("Error fetching user info", {error})
    throw new Error("Error fetching user info")
  }
}

// Helper function to get organization name from org_code
function getOrgNameFromOrgCode(data: UserInfo, orgCode: string, logger: Logger): string | undefined {
  logger.info("Getting org name from org code", {orgCode, data})
  const orgs = data.nhsid_user_orgs || []
  const org = orgs.find((o) => o.org_code === orgCode)
  logger.info("Found org", {org})
  return org ? org.org_name : undefined
}
