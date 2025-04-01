#!/usr/bin/env bash
# shellcheck disable=SC2034
set -e

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo "Script directory: $CURRENT_DIR"

mkdir -p .local_config
FIX_SCRIPT="${CURRENT_DIR}/../.github/scripts/fix_cdk_json.sh"
STATEFUL_CONFIG=".local_config/stateful_app.config.json"
STATELESS_CONFIG=".local_config/stateless_app.config.json"

echo "What is the pull request id?"
read -r PULL_REQUEST_ID

export SERVICE_NAME=cpt-ui-pr-$PULL_REQUEST_ID

echo "Getting exports from stack ${SERVICE_NAME}"

# variables needed for website
userPoolClientId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:userPoolClient:userPoolClientId'].Value" --output text)
userPoolId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:userPool:Id'].Value" --output text)
rumUnauthenticatedRumRoleArn=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:unauthenticatedRumRole:Arn'].Value" --output text)
rumIdentityPoolId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:identityPool:Id'].Value" --output text)
rumAppId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:rumApp:Id'].Value" --output text)
rumAllowCookies=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:config:allowCookies'].Value" --output text)
rumEnableXRay=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:config:enableXRay'].Value" --output text)
rumSessionSampleRate=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:config:sessionSampleRate'].Value" --output text)
rumTelemetries=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:config:telemetries'].Value" --output text)
VERSION_NUMBER="PR-${PULL_REQUEST_ID}"
COMMIT_ID=unknown
AUTO_DELETE_OBJECTS=true
unset CLOUDFRONT_DISTRIBUTION_ID
unset CLOUDFRONT_CERT_ARN
unset SHORT_CLOUDFRONT_DOMAIN
unset FULL_CLOUDFRONT_DOMAIN
unset EPS_DOMAIN_NAME
unset FULL_COGNITO_DOMAIN
unset RUM_LOG_GROUP_ARN
unset RUM_APP_NAME
unset EPS_HOSTED_ZONE_ID
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
USE_CUSTOM_COGNITO_DOMAIN=true
ALLOW_LOCALHOST_ACCESS=true
APIGEE_API_KEY=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeApiKey'].Value" --output text)
APIGEE_CIS2_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeCIS2TokenEndpoint'].Value" --output text)
APIGEE_MOCK_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeMockTokenEndpoint'].Value" --output text)
APIGEE_PRESCRIPTION_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeePrescriptionsEndpoint'].Value" --output text)
APIGEE_PERSONAL_DEMOGRAPHICS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeePersonalDemographicsEndpoint'].Value" --output text)
JWT_KID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:jwtKid'].Value" --output text)
ROLE_ID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:roleId'].Value" --output text)

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

echo "Runnig ${FIX_SCRIPT} for ${STATEFUL_CONFIG}"
"$FIX_SCRIPT" "$STATEFUL_CONFIG"
cat "${STATEFUL_CONFIG}"


# variables needed for statelessResourcesApp
CDK_APP_NAME=StatelessResourcesApp
export CDK_APP_NAME
"$FIX_SCRIPT" "$STATELESS_CONFIG"
cat "${STATELESS_CONFIG}"
