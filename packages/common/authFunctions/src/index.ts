import {getUsernameFromEvent} from "./event"
import {initializeOidcConfig} from "./initialization"

import {
  getSigningKey,
  fetchCIS2TokensFromDynamoDB,
  fetchAndVerifyCIS2Tokens,
  verifyIdToken,
  OidcConfig,
  decodeToken
} from "./cis2"

import {
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  getExistingApigeeAccessToken,
  refreshApigeeAccessToken
} from "./apigee"

import {authenticateRequest} from "./authenticateRequest"

export {
  getUsernameFromEvent,
  getSigningKey,
  fetchCIS2TokensFromDynamoDB,
  fetchAndVerifyCIS2Tokens,
  verifyIdToken,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  OidcConfig,
  initializeOidcConfig,
  getExistingApigeeAccessToken,
  decodeToken,
  refreshApigeeAccessToken,
  authenticateRequest
}
