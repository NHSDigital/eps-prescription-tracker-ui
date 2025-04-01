#!/usr/bin/env bash

echo "What is the pull request id?"
read -r PULL_REQUEST_ID

export SERVICE_NAME=cpt-ui-pr-$PULL_REQUEST_ID

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

# variables needed for StatefulResourcesApp
CDK_APP_NAME=StatefulResourcesApp
VERSION_NUMBER=PR-$PULL_REQUEST_ID
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
PRIMARY_OIDC_JWKS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryTokenEndpoint'].Value" --output text)
MOCK_OIDC_CLIENT_ID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcClientId'].Value" --output text)
MOCK_OIDC_ISSUER=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcIssuer'].Value" --output text)
MOCK_OIDC_AUTHORIZE_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcAuthorizeEndpoint'].Value" --output text)
MOCK_OIDC_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcUserInfoEndpoint'].Value" --output text)
MOCK_OIDC_USERINFO_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcjwksEndpoint'].Value" --output text)
MOCK_OIDC_JWKS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockTokenEndpoint'].Value" --output text)
LOG_RETENTION_IN_DAYS=30
LOG_LEVEL=debug
USE_CUSTOM_COGNITO_DOMAIN=true
ALLOW_LOCALHOST_ACCESS=true


# variables needed for statelessResourcesApp
CDK_APP_NAME=StatelessResourcesApp
VERSION_NUMBER=PR-$PULL_REQUEST_ID
COMMIT_ID=undefined
AUTO_DELETE_OBJECTS=true
LOG_RETENTION_IN_DAYS=30
LOG_LEVEL=debug
unset EPS_DOMAIN_NAME
unset EPS_HOSTED_ZONE_ID
unset CLOUDFRONT_DISTRIBUTION_ID
unset SHORT_CLOUDFRONT_DOMAIN
unset FULL_CLOUDFRONT_DOMAIN
unset FULL_COGNITO_DOMAIN
unset RUM_LOG_GROUP_ARN
unset RUM_APP_NAME
PRIMARY_OIDC_CLIENT_ID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcClientId'].Value" --output text)
PRIMARY_OIDC_ISSUER=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcIssuer'].Value" --output text)
PRIMARY_OIDC_AUTHORIZE_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcAuthorizeEndpoint'].Value" --output text)
PRIMARY_OIDC_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcUserInfoEndpoint'].Value" --output text)
PRIMARY_OIDC_USERINFO_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryOidcjwksEndpoint'].Value" --output text)
PRIMARY_OIDC_JWKS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:primaryTokenEndpoint'].Value" --output text)
MOCK_OIDC_CLIENT_ID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcClientId'].Value" --output text)
MOCK_OIDC_ISSUER=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcIssuer'].Value" --output text)
MOCK_OIDC_AUTHORIZE_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcAuthorizeEndpoint'].Value" --output text)
MOCK_OIDC_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcUserInfoEndpoint'].Value" --output text)
MOCK_OIDC_USERINFO_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockOidcjwksEndpoint'].Value" --output text)
MOCK_OIDC_JWKS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:local:mockTokenEndpoint'].Value" --output text)
USE_MOCK_OIDC=true

APIGEE_API_KEY=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeApiKey'].Value" --output text)
APIGEE_CIS2_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeCIS2TokenEndpoint'].Value" --output text)
APIGEE_MOCK_TOKEN_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeeMockTokenEndpoint'].Value" --output text)
APIGEE_PRESCRIPTION_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeePrescriptionsEndpoint'].Value" --output text)
APIGEE_PERSONAL_DEMOGRAPHICS_ENDPOINT=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:apigeePersonalDemographicsEndpoint'].Value" --output text)
JWT_KID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:jwtKid'].Value" --output text)
ROLE_ID=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateless-resources:local:roleId'].Value" --output text)
