
process.env.apigeeHost = "https://dummyApigee"
process.env.apigeeCIS2TokenEndpoint = `${process.env.apigeeHost}/cis2_token`
process.env.apigeeMockTokenEndpoint = `${process.env.apigeeHost}/mock_token`
process.env.apigeePrescriptionsEndpoint = `${process.env.apigeeHost}/prescriptions`
process.env.apigeePersonalDemographicsEndpoint = `${process.env.apigeeHost}/Patient`

process.env.TokenMappingTableName = "dummyTable"
process.env.jwtPrivateKeyArn = "dummy_jwtPrivateKeyArn"
process.env.jwtKid = "jwt_kid"
process.env.roleId = "dummy_role"
process.env.MOCK_MODE_ENABLED = "true"

process.env.CIS2_OIDC_ISSUER = "valid_cis2_iss"
process.env.CIS2_OIDC_CLIENT_ID = "valid_cis2_aud"
process.env.CIS2_OIDC_HOST = "https://dummy_cis2_auth.com"
process.env.CIS2_OIDCJWKS_ENDPOINT = `${process.env.CIS2_OIDC_HOST}/.well-known/jwks.json`
process.env.CIS2_USER_INFO_ENDPOINT = `${process.env.CIS2_OIDC_HOST}/userinfo`
process.env.CIS2_USER_POOL_IDP = "CIS2DummyPoolIdentityProvider"
process.env.CIS2_IDP_TOKEN_PATH = `${process.env.CIS2_OIDC_HOST}/token`

process.env.MOCK_OIDC_ISSUER = "valid_mock_iss"
process.env.MOCK_OIDC_CLIENT_ID = "valid_mock_aud"
process.env.MOCK_OIDC_HOST = "https://dummy_mock_auth.com"
process.env.MOCK_OIDCJWKS_ENDPOINT = `${process.env.MOCK_OIDC_HOST}/.well-known/jwks.json`
process.env.MOCK_USER_INFO_ENDPOINT = `${process.env.MOCK_OIDC_HOST}/userinfo`
process.env.MOCK_USER_POOL_IDP = "MockDummyPoolIdentityProvider"
process.env.MOCK_IDP_TOKEN_PATH = `${process.env.MOCK_OIDC_HOST}/token`
