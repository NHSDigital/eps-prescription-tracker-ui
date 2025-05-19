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
  logger: Logger,
  oidcConfig: OidcConfig
): Promise<TrackerUserInfo> => {

  logger.info("Fetching user info from OIDC UserInfo endpoint", {oidcConfig})

  // Verify and decode cis2IdToken
  const decodedIdToken = decodeToken(cis2IdToken)
  logger.debug("Decoded cis2IdToken", {decodedIdToken})

  // Extract the selected_roleid from the decoded cis2IdToken
  const selectedRoleId = decodedIdToken?.payload?.selected_roleid
  logger.info("Selected role ID extracted from cis2IdToken", {selectedRoleId})

  if (!oidcConfig.oidcUserInfoEndpoint) {
    throw new Error("OIDC UserInfo endpoint not set")
  }

  try {
    const response = await axios.get(
      oidcConfig.oidcUserInfoEndpoint,
      // "https://internal-dev.api.service.nhs.uk/oauth2-mock/userinfo",
      {
        headers: {
          Authorization: `Bearer ${cis2AccessToken}`
        }
      })
    logger.debug("User info fetched successfully", {userInfo: response.data})

    // Extract the roles from the user info response
    const data = response.data

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
