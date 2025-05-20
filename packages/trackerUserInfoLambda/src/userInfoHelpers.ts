import {Logger} from "@aws-lambda-powertools/logger"
import axios, {isAxiosError} from "axios"
import {OidcConfig, decodeToken} from "@cpt-ui-common/authFunctions"
import {extractRoleInformation, TrackerUserInfo} from "@cpt-ui-common/dynamoFunctions"
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
  apigeeAccessToken: string,
  isMockToken: boolean,
  logger: Logger,
  oidcConfig: OidcConfig
): Promise<TrackerUserInfo> => {

  logger.info("Fetching user info from OIDC UserInfo endpoint", {oidcConfig})
  if (!oidcConfig.oidcUserInfoEndpoint) {
    throw new Error("OIDC UserInfo endpoint not set")
  }

  let authorizationHeader, selectedRoleId
  if (isMockToken) {
    authorizationHeader = {Authorization: `Bearer ${apigeeAccessToken}`}
  } else {
    authorizationHeader = {Authorization: `Bearer ${cis2AccessToken}`}
    const decodedIdToken = decodeToken(cis2IdToken)
    logger.debug("Decoded cis2IdToken", {decodedIdToken})
    selectedRoleId = decodedIdToken?.payload?.selected_roleid
    logger.debug("Selected role ID extracted from cis2IdToken", {selectedRoleId})
  }

  try {
    const response = await axios.get(
      oidcConfig.oidcUserInfoEndpoint,
      {headers: authorizationHeader})
    logger.debug("User info fetched successfully", {userInfo: response.data})

    const data = response.data

    return extractRoleInformation(
      data,
      selectedRoleId ?? data.selected_roleid,
      logger
    )

  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        logger.error("received this response", {response: error.response})
      }
    }
    logger.error("Error fetching user info", {error})
    throw new Error("Error fetching user info")
  }
}
