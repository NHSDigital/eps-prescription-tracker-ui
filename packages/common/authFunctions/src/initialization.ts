import jwksClient from "jwks-rsa"
import {OidcConfig} from "./cis2"

export function initializeOidcConfig() {
  // Create a JWKS client for cis2 and mock
// this is outside functions so it can be re-used
  const cis2JwksUri = process.env["CIS2_OIDCJWKS_ENDPOINT"] as string
  const cis2JwksClient = jwksClient({
    jwksUri: cis2JwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  const cis2OidcConfig: OidcConfig = {
    oidcIssuer: process.env["CIS2_OIDC_ISSUER"] ?? "",
    oidcClientID: process.env["CIS2_OIDC_CLIENT_ID"] ?? "",
    oidcJwksEndpoint: process.env["CIS2_OIDCJWKS_ENDPOINT"] ?? "",
    oidcUserInfoEndpoint: process.env["CIS2_USER_INFO_ENDPOINT"] ?? "",
    userPoolIdp: process.env["CIS2_USER_POOL_IDP"] ?? "",
    jwksClient: cis2JwksClient,
    tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
  }

  const mockJwksUri = process.env["MOCK_OIDCJWKS_ENDPOINT"] as string
  const mockJwksClient = jwksClient({
    jwksUri: mockJwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  const mockOidcConfig: OidcConfig = {
    oidcIssuer: process.env["MOCK_OIDC_ISSUER"] ?? "",
    oidcClientID: process.env["MOCK_OIDC_CLIENT_ID"] ?? "",
    oidcJwksEndpoint: process.env["MOCK_OIDCJWKS_ENDPOINT"] ?? "",
    oidcUserInfoEndpoint: process.env["MOCK_USER_INFO_ENDPOINT"] ?? "",
    userPoolIdp: process.env["MOCK_USER_POOL_IDP"] ?? "",
    jwksClient: mockJwksClient,
    tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
  }

  return {cis2OidcConfig, mockOidcConfig}
}
