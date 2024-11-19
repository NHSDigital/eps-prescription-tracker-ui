import axios from "axios"
import {Logger} from "@aws-lambda-powertools/logger"
import {parse, ParsedUrlQuery, stringify} from "querystring"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {PrivateKey} from "jsonwebtoken"
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
