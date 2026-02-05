import {defineConfig, mergeConfig} from "vitest/config"
import sharedVitestConfig from "../../../vitest.shared.config"

const apigeeHost = "https://dummyApigee"
const CIS2_OIDC_HOST = "https://dummy_cis2_auth.com"
const MOCK_OIDC_HOST = "https://dummy_mock_auth.com"

const viteConfig = defineConfig({
  test: {
    env: {
      apigeeHost: apigeeHost,
      apigeeCIS2TokenEndpoint: `${apigeeHost}/cis2_token`,
      apigeeMockTokenEndpoint: `${apigeeHost}/mock_token`,
      apigeePrescriptionsEndpoint: `${apigeeHost}/prescriptions`,
      apigeePersonalDemographicsEndpoint: `${apigeeHost}/Patient`,

      TokenMappingTableName: "dummyTable",
      jwtPrivateKeyArn: "dummy_jwtPrivateKeyArn",
      jwtKid: "jwt_kid",
      roleId: "dummy_role",
      MOCK_MODE_ENABLED: "true",

      CIS2_OIDC_ISSUER: "valid_cis2_iss",
      CIS2_OIDC_CLIENT_ID: "valid_cis2_aud",
      CIS2_OIDC_HOST: CIS2_OIDC_HOST,
      CIS2_OIDCJWKS_ENDPOINT: `${CIS2_OIDC_HOST}/.well-known/jwks.json`,
      CIS2_USER_INFO_ENDPOINT: `${CIS2_OIDC_HOST}/userinfo`,
      CIS2_USER_POOL_IDP: "CIS2DummyPoolIdentityProvider",
      CIS2_IDP_TOKEN_PATH: `${CIS2_OIDC_HOST}/token`,

      MOCK_OIDC_ISSUER: "valid_mock_iss",
      MOCK_OIDC_CLIENT_ID: "valid_mock_aud",
      MOCK_OIDC_HOST: MOCK_OIDC_HOST,
      MOCK_OIDCJWKS_ENDPOINT: `${MOCK_OIDC_HOST}/.well-known/jwks.json`,
      MOCK_USER_INFO_ENDPOINT: `${MOCK_OIDC_HOST}/userinfo`,
      MOCK_USER_POOL_IDP: "MockDummyPoolIdentityProvider",
      MOCK_IDP_TOKEN_PATH: `${MOCK_OIDC_HOST}/token`,
      FULL_CLOUDFRONT_DOMAIN: "cpt-ui-pr-854.dev.eps.national.nhs.uk"
    }
  }
})

export default mergeConfig(sharedVitestConfig, viteConfig)
