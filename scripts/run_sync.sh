#!/usr/bin/env bash
set -e

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo "Script directory: $CURRENT_DIR"

mkdir -p .local_config
FIX_SCRIPT="${CURRENT_DIR}/../.github/scripts/fix_cdk_json.sh"
STATEFUL_CONFIG=".local_config/stateful_app.config.json"
STATELESS_CONFIG=".local_config/stateless_app.config.json"
STATEFUL_LOG=".local_config/stateful_app.log"
STATELESS_LOG=".local_config/stateless_app.log"
WEBSITE_LOG=".local_config/website.log"

echo "What is the pull request id?"
read -r PULL_REQUEST_ID

SERVICE_NAME=cpt-ui-pr-$PULL_REQUEST_ID

echo "Getting exports from stacks ${SERVICE_NAME}"

CF_LONDON_EXPORTS=$(aws cloudformation list-exports --region eu-west-2 --output json)
CF_US_EXPORTS=$(aws cloudformation list-exports --region us-east-1 --output json)

# vars needed for local website
VITE_userPoolClientId=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:userPoolClient:userPoolClientId" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
VITE_userPoolId=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:userPool:Id" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
VITE_RUM_GUEST_ROLE_ARN=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:unauthenticatedRumRole:Arn" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

VITE_RUM_IDENTITY_POOL_ID=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:identityPool:Id" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

VITE_RUM_APPLICATION_ID=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:rumApp:Id" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

VITE_RUM_ALLOW_COOKIES=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:config:allowCookies" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

VITE_RUM_ENABLE_XRAY=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:config:enableXRay" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

VITE_RUM_SESSION_SAMPLE_RATE=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:config:sessionSampleRate" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

VITE_RUM_TELEMETRIES=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:config:telemetries" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
LOCAL_DEV=true
BASE_PATH="/site"
API_DOMAIN_OVERRIDE=https://${SERVICE_NAME}.dev.eps.national.nhs.uk/ 
VITE_hostedLoginDomain=${SERVICE_NAME}.auth.eu-west-2.amazoncognito.com
VITE_redirectSignIn=http://localhost:3000/site/select-your-role
VITE_redirectSignOut=http://localhost:3000/site/logout

VITE_COMMIT_ID="Local Development Server"

REACT_APP_hostedLoginDomain=$VITE_hostedLoginDomain
REACT_APP_userPoolClientId=$VITE_userPoolClientId
REACT_APP_userPoolId=$VITE_userPoolId
REACT_APP_redirectSignIn=$VITE_redirectSignIn
REACT_APP_redirectSignOut=$VITE_redirectSignOut

REACT_APP_RUM_GUEST_ROLE_ARN=$VITE_RUM_GUEST_ROLE_ARN
REACT_APP_RUM_IDENTITY_POOL_ID=$VITE_RUM_IDENTITY_POOL_ID
REACT_APP_RUM_APPLICATION_ID=$VITE_RUM_APPLICATION_ID
REACT_APP_RUM_ALLOW_COOKIES_ARN=$VITE_RUM_ALLOW_COOKIES
REACT_APP_RUM_ENABLE_XRAY=$VITE_RUM_ENABLE_XRAY
REACT_APP_RUM_SESSION_SAMPLE_RATE=$VITE_RUM_SESSION_SAMPLE_RATE
REACT_APP_RUM_TELEMETRIES=$VITE_RUM_TELEMETRIES


# vars needed for cdk
VERSION_NUMBER="PR-${PULL_REQUEST_ID}"
COMMIT_ID=unknown
AUTO_DELETE_OBJECTS=true
CLOUDFRONT_DISTRIBUTION_ID=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:cloudfrontDistribution:Id" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
CLOUDFRONT_CERT_ARN=$(echo "$CF_US_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:cloudfrontCertificate:Arn" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
SHORT_CLOUDFRONT_DOMAIN=$(echo "$CF_US_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:shortCloudfrontDomain:Name" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
FULL_CLOUDFRONT_DOMAIN=$(echo "$CF_US_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:fullCloudfrontDomain:Name" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
EPS_DOMAIN_NAME=$(echo "$CF_LONDON_EXPORTS" | jq  -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-domain") | .Value')
FULL_COGNITO_DOMAIN=$(echo "$CF_US_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:fullCognitoDomain:Name" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
RUM_LOG_GROUP_ARN=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:logGroup:arn" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
RUM_APP_NAME=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:rumApp:Name" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
EPS_HOSTED_ZONE_ID=$(echo "$CF_LONDON_EXPORTS" | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-ZoneID") | .Value')
USE_MOCK_OIDC=true
PRIMARY_OIDC_CLIENT_ID=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:primaryOidcClientId" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
PRIMARY_OIDC_ISSUER=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:primaryOidcIssuer" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
PRIMARY_OIDC_AUTHORIZE_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:primaryOidcAuthorizeEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
PRIMARY_OIDC_TOKEN_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:primaryOidcTokenEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
PRIMARY_OIDC_USERINFO_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:primaryOidcUserInfoEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
PRIMARY_OIDC_JWKS_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:primaryOidcjwksEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
MOCK_OIDC_CLIENT_ID=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:mockOidcClientId" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
MOCK_OIDC_ISSUER=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:mockOidcIssuer" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
MOCK_OIDC_AUTHORIZE_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:mockOidcAuthorizeEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
MOCK_OIDC_TOKEN_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:mockOidcTokenEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
MOCK_OIDC_USERINFO_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:mockOidcUserInfoEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
MOCK_OIDC_JWKS_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:local:mockOidcjwksEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
LOG_RETENTION_IN_DAYS=30
LOG_LEVEL=debug
USE_CUSTOM_COGNITO_DOMAIN=false
ALLOW_LOCALHOST_ACCESS=true
APIGEE_API_KEY=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:local:apigeeApiKey" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
APIGEE_CIS2_TOKEN_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:local:apigeeCIS2TokenEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

APIGEE_MOCK_TOKEN_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:local:apigeeMockTokenEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
APIGEE_PRESCRIPTION_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:local:apigeePrescriptionsEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
APIGEE_PERSONAL_DEMOGRAPHICS_ENDPOINT=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:local:apigeePersonalDemographicsEndpoint" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

JWT_KID=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:local:jwtKid" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
ROLE_ID=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:local:roleId" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

# export all the vars so they can be picked up by external programs
export SERVICE_NAME
export VITE_userPoolClientId
export VITE_userPoolId
export VITE_RUM_GUEST_ROLE_ARN
export VITE_RUM_IDENTITY_POOL_ID
export VITE_RUM_APPLICATION_ID
export VITE_RUM_ALLOW_COOKIES
export VITE_RUM_ENABLE_XRAY
export VITE_RUM_SESSION_SAMPLE_RATE
export VITE_RUM_TELEMETRIES
export LOCAL_DEV
export BASE_PATH
export API_DOMAIN_OVERRIDE
export VITE_hostedLoginDomain
export VITE_redirectSignIn
export VITE_redirectSignOut
export VITE_COMMIT_ID
export REACT_APP_hostedLoginDomain
export REACT_APP_userPoolClientId
export REACT_APP_userPoolId
export REACT_APP_redirectSignIn
export REACT_APP_redirectSignOut
export REACT_APP_RUM_GUEST_ROLE_ARN
export REACT_APP_RUM_IDENTITY_POOL_ID
export REACT_APP_RUM_APPLICATION_ID
export REACT_APP_RUM_ALLOW_COOKIES_ARN
export REACT_APP_RUM_ENABLE_XRAY
export REACT_APP_RUM_SESSION_SAMPLE_RATE
export REACT_APP_RUM_TELEMETRIES

export VERSION_NUMBER
export COMMIT_ID
export AUTO_DELETE_OBJECTS
export CLOUDFRONT_DISTRIBUTION_ID
export CLOUDFRONT_CERT_ARN
export SHORT_CLOUDFRONT_DOMAIN
export FULL_CLOUDFRONT_DOMAIN
export EPS_DOMAIN_NAME
export FULL_COGNITO_DOMAIN
export RUM_LOG_GROUP_ARN
export RUM_APP_NAME
export EPS_HOSTED_ZONE_ID
export USE_MOCK_OIDC
export PRIMARY_OIDC_CLIENT_ID
export PRIMARY_OIDC_ISSUER
export PRIMARY_OIDC_AUTHORIZE_ENDPOINT
export PRIMARY_OIDC_TOKEN_ENDPOINT
export PRIMARY_OIDC_USERINFO_ENDPOINT
export PRIMARY_OIDC_JWKS_ENDPOINT
export MOCK_OIDC_CLIENT_ID
export MOCK_OIDC_ISSUER
export MOCK_OIDC_AUTHORIZE_ENDPOINT
export MOCK_OIDC_TOKEN_ENDPOINT
export MOCK_OIDC_USERINFO_ENDPOINT
export MOCK_OIDC_JWKS_ENDPOINT
export LOG_RETENTION_IN_DAYS
export LOG_LEVEL
export USE_CUSTOM_COGNITO_DOMAIN
export ALLOW_LOCALHOST_ACCESS
export APIGEE_API_KEY
export APIGEE_CIS2_TOKEN_ENDPOINT
export APIGEE_MOCK_TOKEN_ENDPOINT
export APIGEE_PRESCRIPTION_ENDPOINT
export APIGEE_PERSONAL_DEMOGRAPHICS_ENDPOINT
export JWT_KID
export ROLE_ID

# variables needed for StatefulResourcesApp
CDK_APP_NAME=StatefulResourcesApp
export CDK_APP_NAME

echo "Generating config for ${STATEFUL_CONFIG}"
"$FIX_SCRIPT" "$STATEFUL_CONFIG"

# variables needed for statelessResourcesApp
CDK_APP_NAME=StatelessResourcesApp
export CDK_APP_NAME
echo "Generating config for ${STATELESS_CONFIG}"
"$FIX_SCRIPT" "$STATELESS_CONFIG"

sync_stateful_app() {
    echo "Starting sync stateful CDK app"
    echo "Stateful CDK app log file at ${STATEFUL_LOG}"
    CONFIG_FILE_NAME="${STATEFUL_CONFIG}" npx cdk deploy \
        --app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatefulResourcesApp.ts" \
        --watch \
        --all \
        --ci true \
        --require-approval never \
        --output .local_config/stateful_app.out/ \
        > $STATEFUL_LOG 2>&1
}

sync_stateless_app() {
    echo "Starting sync stateless CDK app"
    echo "Stateless CDK app log file at ${STATELESS_LOG}"
    CONFIG_FILE_NAME="${STATELESS_CONFIG}" npx cdk deploy \
        --app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatelessResourcesApp.ts" \
        --watch \
        --all \
        --ci true \
        --require-approval never \
        --output .local_config/stateless_app.out/ \
        > $STATELESS_LOG  2>&1
}

start_website() {
    echo "Starting website"
    echo "Website log file at ${WEBSITE_LOG}"
    npm run dev --workspace packages/cpt-ui > $WEBSITE_LOG  2>&1
}

echo "Compiling code"
make compile
(trap 'kill 0' SIGINT; sync_stateful_app & sync_stateless_app & start_website)
