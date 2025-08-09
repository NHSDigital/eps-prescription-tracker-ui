import {getUsernameFromEvent, getSessionIdFromEvent} from "./event"
import {initializeOidcConfig} from "./initialization"

import {
  getSigningKey,
  verifyIdToken,
  OidcConfig,
  decodeToken
} from "./cis2"

import {
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  refreshApigeeAccessToken,
  buildApigeeHeaders
} from "./apigee"

import {
  authenticateRequest,
  AuthResult,
  authParametersFromEnv,
  AuthenticateRequestOptions
} from "./authenticateRequest"

import {fetchUserInfo} from "./userInfoHelpers"

import {authenticationMiddleware} from "./authenticationMiddleware"
import {authenticationConcurrentAwareMiddleware} from "./authenticationConcurrentAwareMiddleware"

export {
  getUsernameFromEvent,
  getSessionIdFromEvent,
  getSigningKey,
  verifyIdToken,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  OidcConfig,
  initializeOidcConfig,
  decodeToken,
  refreshApigeeAccessToken,
  buildApigeeHeaders,
  authenticateRequest,
  AuthResult,
  authParametersFromEnv,
  AuthenticateRequestOptions,
  fetchUserInfo,
  authenticationMiddleware,
  authenticationConcurrentAwareMiddleware
}
