import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import axios from "axios"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import jwt, {JwtPayload} from "jsonwebtoken"
import jwksClient from "jwks-rsa"
import {
  UserInfoResponse,
  TrackerUserInfo,
  RoleDetails,
  UserDetails
} from "./cis2TokenTypes"

const VALID_ACR_VALUES: Array<string> = [
  "AAL3_ANY",
  "AAL2_OR_AAL3_ANY",
  "AAL2_ANY",
  "AAL1_USERPASS"
]

export const getIdTokenFromEvent = (event: APIGatewayProxyEvent): string => {
  const authorizationHeader = event.headers["Authorization"] || event.headers["authorization"]
  if (!authorizationHeader) {
    throw new Error("Authorization header missing")
  }
  return authorizationHeader.replace("Bearer ", "").trim()
}

export const getUsernameFromEvent = (event: APIGatewayProxyEvent): string => {
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    throw new Error("Unable to extract username from ID token")
  }
  return username
}

export const fetchCIS2TokensFromDynamoDB = async (
  username: string,
  tokenMappingTableName: string,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
): Promise<{ cis2AccessToken: string; cis2IdToken: string }> => {
  try {
    logger.info("Fetching CIS2 access token from DynamoDB")
    const result = await documentClient.send(
      new GetCommand({
        TableName: tokenMappingTableName,
        Key: {username}
      })
    )
    logger.debug("DynamoDB response", {result})

    if (result.Item) {
      const existingData = result.Item
      return {
        cis2AccessToken: existingData.CIS2_accessToken,
        cis2IdToken: existingData.CIS2_idToken
      }
    } else {
      logger.error("CIS2 access token not found for user")
      throw new Error("CIS2 access token not found for user")
    }
  } catch (error) {
    logger.error("Error fetching data from DynamoDB", {error})
    throw new Error("Internal server error while accessing DynamoDB")
  }
}

export const fetchAndVerifyCIS2Tokens = async (
  event: APIGatewayProxyEvent,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
) => {
  logger.info("Fetching and verifying CIS2 tokens")

  const tokenMappingTableName = process.env["TokenMappingTableName"]
  if (!tokenMappingTableName) {
    throw new Error("Token mapping table name not set")
  }

  // Extract ID token
  const idToken = getIdTokenFromEvent(event)

  // Extract username
  const username = getUsernameFromEvent(event)
  logger.info("Extracted username from ID token", {username})

  // Fetch CIS2 tokens from DynamoDB
  const {cis2AccessToken, cis2IdToken} = await fetchCIS2TokensFromDynamoDB(
    username,
    tokenMappingTableName,
    documentClient,
    logger
  )

  // Verify the ID token
  await verifyIdToken(idToken, logger)

  // And return the verified tokens
  return {cis2AccessToken, cis2IdToken}
}

export const verifyIdToken = async (idToken: string, logger: Logger) => {
  const oidcIssuer = process.env["oidcIssuer"]
  if (!oidcIssuer) {
    throw new Error("OIDC issuer not set")
  }
  const oidcClientId = process.env["oidcClientId"]
  if (!oidcClientId) {
    throw new Error("OIDC client ID not set")
  }
  const jwksUri = process.env["oidcjwksEndpoint"]
  if (!jwksUri) {
    throw new Error("JWKS URI not set")
  }

  logger.info("Verifying ID token", {oidcIssuer, oidcClientId, jwksUri})

  if (!idToken) {
    throw new Error("ID token not provided")
  }

  // Create a JWKS client
  const client = jwksClient({
    jwksUri: `${jwksUri}`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  // Decode the token header to get the kid
  const decodedToken = jwt.decode(idToken, {complete: true})
  if (!decodedToken || typeof decodedToken === "string") {
    throw new Error("Invalid token")
  }
  const kid = decodedToken.header.kid

  // Fetch the signing key from the JWKS endpoint
  let signingKey
  try {
    if (!kid) {
      throw new Error("Invalid token")
    }
    logger.info("Fetching signing key", {kid})
    client.getSigningKey(kid, (err, key) => {
      if (!key) {
        throw new Error("Key not found")
      }
      if (err) {
        throw err
      }

      signingKey = key.getPublicKey()
    })
  } catch (err) {
    logger.error("Error getting signing key", {err})
    throw new Error("Error getting signing key")
  }

  // Verify the token
  const options = {
    issuer: oidcIssuer,
    audience: oidcClientId,
    clockTolerance: 5 // seconds
  }

  let verifiedToken: JwtPayload
  try {
    verifiedToken = jwt.verify(idToken, signingKey, options) as JwtPayload
  } catch (err) {
    logger.error("Error verifying token", {err})
    throw new Error("Invalid ID token")
  }

  logger.info("ID token verified successfully", {verifiedToken})

  // Manual Verification checks,
  // c.f. https://tinyurl.com/2rz5xxup

  // Check that token hasn't expired (verification step above should do this, but just in case)
  const now = Math.floor(Date.now() / 1000)
  if (verifiedToken.exp && verifiedToken.exp < now) {
    throw new Error("ID token has expired")
  }
  logger.debug("Token has not expired", {exp: verifiedToken.exp})

  // the iss claim MUST exactly match the issuer in the OIDC configuration
  if (verifiedToken.iss !== oidcIssuer) {
    throw new Error("Invalid issuer in ID token")
  }
  logger.debug("iss claim is valid", {iss: verifiedToken.iss})

  // the aud MUST contain our relying party client_id value
  // 'aud' can be a string or an array
  const aud = verifiedToken.aud
  const audArray = Array.isArray(aud) ? aud : [aud]
  if (!audArray.includes(oidcClientId)) {
    throw new Error("Invalid audience in ID token")
  }
  logger.debug("aud claim is valid", {aud})

  // FIXME: un-completed checks!
  // From what I can tell, we're not using a known nonce. If we do end up using one, we should check it here.

  // The `acr` claim must be present and have a valid value
  const acr = verifiedToken.acr
  if (!acr) {
    throw new Error("acr claim missing from ID token")
  }
  if (!VALID_ACR_VALUES.includes(acr)) {
    throw new Error("Invalid acr value in ID token")
  }
  logger.debug("acr claim is valid", {acr})

  // Check that the `auth_time` claim is present and that its value is not too far in the past
  const auth_time = verifiedToken.auth_time
  if (!auth_time) {
    throw new Error("auth_time claim missing from ID token")
  }
  // If the current time is AFTER auth_time, the token needs to be refreshed. It's not expired yet, but it's too old.
  if (now > auth_time) {
    // This COULD trigger a key refresh, but that's explicitly not recommended for the userInfo endpoint.
    // I'll leave that to future work, where it actually is necessary, and just throw an error here.
    //
    // From the docs:
    //   It is anticipated that Relying Parties will only require access to the UserInfo Endpoint at the time of the
    //   original End-User authentication. This should only happen once as part of a Relying Party authentication
    //   journey and the Access Token can be used immediately, then discarded. In NHS CIS2 Authentication, there should
    //   be no other need to retrieve the User Info after this point in time.
    //   Therefore the use of the Refresh Token to obtain a new Access Token is not recommended.

    throw new Error("ID token has expired")
  }
  logger.debug("auth_time claim is valid", {auth_time})
}

// Fetch user info from the OIDC UserInfo endpoint
// The access token is used to identify the user, and fetch their roles.
// This populates three lists:
//  - rolesWithAccess: roles that have access to the CPT
//  - rolesWithoutAccess: roles that don't have access to the CPT
//  - [OPTIONAL] currentlySelectedRole: the role that is currently selected by the user
// Each list contains information on the roles, such as the role name, role ID, ODS code, and organization name.
export const fetchUserInfo = async (
  accessToken: string,
  accepted_access_codes: Array<string>,
  selectedRoleId: string | undefined,
  logger: Logger
): Promise<TrackerUserInfo> => {

  const oidcUserInfoEndpoint = process.env["userInfoEndpoint"]
  logger.info("Fetching user info from OIDC UserInfo endpoint", {oidcUserInfoEndpoint})

  if (!oidcUserInfoEndpoint) {
    throw new Error("OIDC UserInfo endpoint not set")
  }

  try {
    const response = await axios.get<UserInfoResponse>(oidcUserInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    logger.info("User info fetched successfully", {data: response.data})

    // Extract the roles from the user info response
    const data: UserInfoResponse = response.data

    // These will be our outputs
    const rolesWithAccess: Array<RoleDetails> = []
    const rolesWithoutAccess: Array<RoleDetails> = []
    let currentlySelectedRole: RoleDetails | undefined = undefined

    // Get roles from the user info response
    const roles = data.nhsid_nrbac_roles || []

    roles.forEach((role) => {
      logger.debug("Processing role", {role})
      const activityCodes = role.activity_codes || []

      const hasAccess = activityCodes.some((code: string) => accepted_access_codes.includes(code))
      logger.debug("Role CPT access?", {hasAccess})

      const roleInfo: RoleDetails = {
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
      logger.debug("Checking if role is currently selected", {selectedRoleId, roleID: role.person_roleid, roleInfo})
      if (selectedRoleId && role.person_roleid === selectedRoleId) {
        logger.debug("Role is currently selected", {roleID: role.person_roleid, roleInfo})
        if (hasAccess) {
          logger.debug("Role has access; setting as currently selected", {roleInfo})
          currentlySelectedRole = roleInfo
        } else {
          logger.debug("Role does not have access; unsetting currently selected role", {roleInfo})
          currentlySelectedRole = undefined
        }
      }
    })

    const userDetails: UserDetails = {
      given_name: data.given_name,
      family_name: data.family_name,
      name: data.name,
      display_name: data.display_name,
      title: data.title,
      initials: data.initials,
      middle_names: data.middle_names
    }

    const result: TrackerUserInfo = {
      user_details: userDetails,
      roles_with_access: rolesWithAccess,
      roles_without_access: rolesWithoutAccess,
      currently_selected_role: currentlySelectedRole
    }

    logger.info("Returning user info response", {result})
    return result
  } catch (error) {
    logger.error("Error fetching user info", {error})
    throw new Error("Error fetching user info")
  }
}

// Helper function to get organization name from org_code
function getOrgNameFromOrgCode(data: UserInfoResponse, orgCode: string, logger: Logger): string | undefined {
  logger.info("Getting org name from org code", {orgCode, data})
  const orgs = data.nhsid_user_orgs || []
  const org = orgs.find((o) => o.org_code === orgCode)
  logger.info("Found org", {org})
  return org ? org.org_name : undefined
}