import axios from "axios"
import {Logger} from "@aws-lambda-powertools/logger"
import {parse, ParsedUrlQuery, stringify} from "querystring"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {JwtPayload, PrivateKey} from "jsonwebtoken"
import {verifyJWTWrapper, rewriteBodyToAddSignedJWT} from "./helpers"

const axiosInstance = axios.create()

interface FetchAndVerifyTokensParams {
  logger: Logger;
  body: string;
  useSignedJWT: string;
  jwtPrivateKeyArn: string;
  idpTokenPath: string;
  oidcIssuer: string;
  oidcClientId: string;
}

export async function fetchAndVerifyCIS2Tokens(params: FetchAndVerifyTokensParams) {
  const {
    logger,
    body,
    useSignedJWT,
    jwtPrivateKeyArn,
    idpTokenPath,
    oidcIssuer,
    oidcClientId
  } = params

  const objectBodyParameters = parse(body)
  logger.debug("Parsed request body parameters", {objectBodyParameters})

  let rewrittenObjectBodyParameters: ParsedUrlQuery

  if (useSignedJWT === "true") {
    try {
      logger.info("Fetching JWT private key")
      const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
      rewrittenObjectBodyParameters = rewriteBodyToAddSignedJWT(
        logger, objectBodyParameters, idpTokenPath, jwtPrivateKey as PrivateKey
      )
      logger.debug("Rewritten body with signed JWT", {rewrittenObjectBodyParameters})
    } catch (error) {
      logger.error("Error fetching or processing JWT private key", {error})
      throw error
    }
  } else {
    rewrittenObjectBodyParameters = objectBodyParameters
    logger.info("JWT signing is not enabled, using original body parameters")
  }

  logger.debug("Calling downstream IDP with rewritten body", {idpTokenPath, body: rewrittenObjectBodyParameters})

  try {
    const tokenResponse = await axiosInstance.post(idpTokenPath, stringify(rewrittenObjectBodyParameters))
    logger.debug("Response from external OIDC", {data: tokenResponse.data})

    const accessToken = tokenResponse.data.access_token
    const idToken = tokenResponse.data.id_token

    // Ensure tokens exist before proceeding
    if (!accessToken || !idToken) {
      logger.error("Failed to retrieve tokens from OIDC response")
      throw new Error("Failed to retrieve tokens from OIDC response")
    }

    // Verify and decode idToken
    logger.info("Verifying and decoding ID token")
    const decodedIdToken = await verifyJWTWrapper(idToken, oidcIssuer, oidcClientId)
    logger.debug("Decoded idToken", {decodedIdToken})

    return {
      accessToken,
      idToken,
      decodedIdToken
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error occurred while fetching or verifying tokens", {error: error.message})
    } else {
      logger.error("Unknown error occurred while fetching or verifying tokens", {error: String(error)})
    }
    throw error
  }
}

interface FetchUserInfoParams {
  logger: Logger;
  accessToken: string;
  decodedIdToken: JwtPayload;
  oidcUserInfoEndpoint: string;
}

export async function fetchUserInfo(params: FetchUserInfoParams) {
  const {
    logger,
    accessToken,
    decodedIdToken,
    oidcUserInfoEndpoint
  } = params

  try {
    logger.info("Sending UserInfo request", {oidcUserInfoEndpoint})

    const userInfoResponse = await axiosInstance.get(oidcUserInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    logger.debug("UserInfo response data", {data: userInfoResponse.data})

    // Verify that the 'sub' claim matches the one in the ID Token
    const userInfoSub = userInfoResponse.data.sub
    const idTokenSub = decodedIdToken.sub

    if (userInfoSub !== idTokenSub) {
      logger.error("The 'sub' claim in UserInfo response does not match the 'sub' in ID Token", {
        userInfoSub,
        idTokenSub
      })
      throw new Error("The 'sub' claim does not match between UserInfo response and ID Token")
    }

    return userInfoResponse.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("Axios error occurred while fetching UserInfo", {
        error: error.message,
        responseData: error.response?.data
      })
      throw new Error(`UserInfo request failed: ${error.message}`)
    } else if (error instanceof Error) {
      logger.error("Error occurred while fetching UserInfo", {
        error: error.message
      })
      throw error
    } else {
      logger.error("Unknown error occurred while fetching UserInfo", {
        error: String(error)
      })
      throw new Error("Unknown error occurred while fetching UserInfo")
    }
  }
}
