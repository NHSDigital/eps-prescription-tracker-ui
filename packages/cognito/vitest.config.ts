import {defineConfig, mergeConfig} from "vitest/config"
import sharedVitestConfig from "../../vitest.shard.config"

const CIS2_OIDC_HOST = "https://dummy_cis2_auth.com"
const MOCK_OIDC_HOST = "https://dummy_mock_auth.com"

const viteConfig = defineConfig({
  test: {
    env: {
      TokenMappingTableName: "dummyTable",
      jwtPrivateKeyArn: "dummy_jwtPrivateKeyArn",
      jwtKid: "jwt_kid",
      useMock: "false",
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
      APIGEE_API_KEY: "apigee_api_key",
      FULL_CLOUDFRONT_DOMAIN: "cpt-ui-pr-854.dev.eps.national.nhs.uk",
      IDP_AUTHORIZE_PATH: "https://example.com/authorize",
      OIDC_CLIENT_ID: "cis2Client123",
      COGNITO_CLIENT_ID: "userPoolClient123",
      COGNITO_DOMAIN: "cognito.example.com",
      SessionManagementTableName: "test-session-management-table",
      MOCK_OIDC_TOKEN_ENDPOINT: "https://internal-dev.api.service.nhs.uk/oauth2-mock/token"
    }
  }
})

export default mergeConfig(sharedVitestConfig, viteConfig)
