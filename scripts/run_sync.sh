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

export SERVICE_NAME=cpt-ui-pr-$PULL_REQUEST_ID

echo "Getting exports from stacks ${SERVICE_NAME}"

CF_LONDON_EXPORTS=$(aws cloudformation list-exports --region eu-west-2 --output json)
CF_US_EXPORTS=$(aws cloudformation list-exports --region us-east-1 --output json)


userPoolClientId=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:userPoolClient:userPoolClientId" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
userPoolId=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:userPool:Id" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
rumUnauthenticatedRumRoleArn=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:unauthenticatedRumRole:Arn" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

rumIdentityPoolId=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:identityPool:Id" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

rumAppId=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:rumApp:Id" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

rumAllowCookies=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:config:allowCookies" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

rumEnableXRay=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:config:enableXRay" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

rumSessionSampleRate=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:config:sessionSampleRate" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

rumTelemetries=$(echo "$CF_LONDON_EXPORTS" | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:config:telemetries" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
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
PRIMARY_OIDC_CLIENT_ID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcClientId'].Value" --output text)
PRIMARY_OIDC_ISSUER=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcIssuer'].Value" --output text)
PRIMARY_OIDC_AUTHORIZE_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcAuthorizeEndpoint'].Value" --output text)
PRIMARY_OIDC_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcUserInfoEndpoint'].Value" --output text)
PRIMARY_OIDC_USERINFO_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcjwksEndpoint'].Value" --output text)
PRIMARY_OIDC_JWKS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcTokenEndpoint'].Value" --output text)
MOCK_OIDC_CLIENT_ID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcClientId'].Value" --output text)
MOCK_OIDC_ISSUER=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcIssuer'].Value" --output text)
MOCK_OIDC_AUTHORIZE_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcAuthorizeEndpoint'].Value" --output text)
MOCK_OIDC_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcTokenEndpoint'].Value" --output text)
MOCK_OIDC_USERINFO_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcUserInfoEndpoint'].Value" --output text)
MOCK_OIDC_JWKS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcjwksEndpoint'].Value" --output text)
LOG_RETENTION_IN_DAYS=30
LOG_LEVEL=debug
USE_CUSTOM_COGNITO_DOMAIN=false
ALLOW_LOCALHOST_ACCESS=true
APIGEE_API_KEY=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeApiKey'].Value" --output text)
APIGEE_CIS2_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeCIS2TokenEndpoint'].Value" --output text)
APIGEE_MOCK_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeMockTokenEndpoint'].Value" --output text)
APIGEE_PRESCRIPTION_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeePrescriptionsEndpoint'].Value" --output text)
APIGEE_PERSONAL_DEMOGRAPHICS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeePersonalDemographicsEndpoint'].Value" --output text)
JWT_KID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:jwtKid'].Value" --output text)
ROLE_ID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:roleId'].Value" --output text)

export userPoolClientId
export userPoolId
export rumUnauthenticatedRumRoleArn
export rumIdentityPoolId
export rumAppId
export rumAllowCookies
export rumEnableXRay
export rumSessionSampleRate
export rumTelemetries
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
    echo "Starting stateful app"
    echo "See log file at ${STATEFUL_LOG}"
    CONFIG_FILE_NAME="${STATEFUL_CONFIG}" npx cdk deploy \
        --app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatefulResourcesApp.ts" \
        --watch \
        --all \
        --ci true \
        --require-approval never \
        --output .local_config/stateful_app.out/ \
        > $STATEFUL_LOG
}

sync_stateless_app() {
    echo "Starting stateless app"
    echo "See log file at ${STATELESS_LOG}"
    CONFIG_FILE_NAME="${STATELESS_CONFIG}" npx cdk deploy \
        --app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatelessResourcesApp.ts" \
        --watch \
        --all \
        --ci true \
        --require-approval never \
        --output .local_config/stateless_app.out/ \
        > $STATELESS_LOG
}

start_website() {
    echo "Starting website"
    echo "See log file at ${WEBSITE_LOG}"
    npm run dev --workspace packages/cpt-ui > $WEBSITE_LOG
}

echo "Compiling code"
make compile
(trap 'kill 0' SIGINT; sync_stateful_app & sync_stateless_app & start_website)
