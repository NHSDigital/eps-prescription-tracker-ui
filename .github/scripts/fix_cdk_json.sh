#!/usr/bin/env bash
set -e

# script used to set context key values in cdk.json pre deployment from environment variables

# helper function to set string values
fix_string_key() {
    KEY_NAME=$1
    KEY_VALUE=$2
    if [ -z "${KEY_VALUE}" ]; then
        echo "${KEY_NAME} value is unset or set to the empty string"
        exit 1
    fi
    echo "Setting ${KEY_NAME}"
    jq \
        --arg key_value "${KEY_VALUE}" \
        --arg key_name "${KEY_NAME}" \
        '.context += {($key_name): $key_value}' .build/cdk.json > .build/cdk.new.json
    mv .build/cdk.new.json .build/cdk.json
}

# helper function to set boolean and number values (without quotes)
fix_boolean_number_key() {
    KEY_NAME=$1
    KEY_VALUE=$2
    if [ -z "${KEY_VALUE}" ]; then
        echo "${KEY_NAME} value is unset or set to the empty string"
        exit 1
    fi
    echo "Setting ${KEY_NAME}"
    jq \
        --argjson key_value "${KEY_VALUE}" \
        --arg key_name "${KEY_NAME}" \
        '.context += {($key_name): $key_value}' .build/cdk.json > .build/cdk.new.json
    mv .build/cdk.new.json .build/cdk.json
}

# get some values from AWS
EPS_DOMAIN_NAME=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-domain") | .Value')
EPS_HOSTED_ZONE_ID=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-ZoneID") | .Value')
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation list-exports --output json | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:cloudfrontDistribution:Id" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
CLOUDFRONT_CERT_ARN=$(aws cloudformation list-exports --region us-east-1 --output json | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:cloudfrontCertificate:Arn" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
SHORT_CLOUDFRONT_DOMAIN=$(aws cloudformation list-exports --region us-east-1 --output json | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:shortCloudfrontDomain:Name" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
FULL_CLOUDFRONT_DOMAIN=$(aws cloudformation list-exports --region us-east-1 --output json | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:fullCloudfrontDomain:Name" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
FULL_COGNITO_DOMAIN=$(aws cloudformation list-exports --region us-east-1 --output json | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:fullCognitoDomain:Name" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
RUM_LOG_GROUP_ARN=$(aws cloudformation list-exports --region eu-west-2 --output json | \
    jq \
    --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:logGroup:arn" \
    -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')

# go through all the key values we need to set
fix_string_key serviceName "${SERVICE_NAME}"
fix_string_key VERSION_NUMBER "${VERSION_NUMBER}"
fix_string_key COMMIT_ID "${COMMIT_ID}"
fix_string_key logRetentionInDays "${LOG_RETENTION_IN_DAYS}"
fix_string_key logLevel "${LOG_LEVEL}"

if [ "$CDK_APP_NAME" == "StatefulResourcesApp" ]; then
    fix_string_key primaryOidcClientId "${PRIMARY_OIDC_CLIENT_ID}"
    fix_string_key primaryOidcIssuer "${PRIMARY_OIDC_ISSUER}"
    fix_string_key primaryOidcAuthorizeEndpoint "${PRIMARY_OIDC_AUTHORIZE_ENDPOINT}"
    fix_string_key primaryOidcTokenEndpoint "${PRIMARY_OIDC_TOKEN_ENDPOINT}"
    fix_string_key primaryOidcUserInfoEndpoint "${PRIMARY_OIDC_USERINFO_ENDPOINT}"
    fix_string_key primaryOidcjwksEndpoint "${PRIMARY_OIDC_JWKS_ENDPOINT}"

    fix_boolean_number_key useMockOidc "${USE_MOCK_OIDC}"
    if [ "$USE_MOCK_OIDC" == "true" ]; then
        fix_string_key mockOidcClientId "${MOCK_OIDC_CLIENT_ID}"
        fix_string_key mockOidcIssuer "${MOCK_OIDC_ISSUER}"
        fix_string_key mockOidcAuthorizeEndpoint "${MOCK_OIDC_AUTHORIZE_ENDPOINT}"
        fix_string_key mockOidcTokenEndpoint "${MOCK_OIDC_TOKEN_ENDPOINT}"
        fix_string_key mockOidcUserInfoEndpoint "${MOCK_OIDC_USERINFO_ENDPOINT}"
        fix_string_key mockOidcjwksEndpoint "${MOCK_OIDC_JWKS_ENDPOINT}"
    fi

    fix_boolean_number_key useCustomCognitoDomain "${USE_CUSTOM_COGNITO_DOMAIN}"

    fix_string_key epsDomainName "${EPS_DOMAIN_NAME}"
    fix_string_key epsHostedZoneId "${EPS_HOSTED_ZONE_ID}"

    fix_boolean_number_key allowAutoDeleteObjects "${AUTO_DELETE_OBJECTS}"
    # we may not have cloudfront distribution id if its a first deployment
    if [ -n "${CLOUDFRONT_DISTRIBUTION_ID}" ]; then
        fix_string_key cloudfrontDistributionId "${CLOUDFRONT_DISTRIBUTION_ID}"
    fi
    # if we have a rum log group arn, then we can set cwLogEnabled on the rum app
    if [ -n "${RUM_LOG_GROUP_ARN}" ]; then
        fix_boolean_number_key rumCloudwatchLogEnabled "true"
    else
        fix_boolean_number_key rumCloudwatchLogEnabled "false"
    fi
    fix_boolean_number_key allowLocalhostAccess "${USE_LOCALHOST_CALLBACK}"

elif [ "$CDK_APP_NAME" == "StatelessResourcesApp" ]; then
    fix_string_key epsDomainName "${EPS_DOMAIN_NAME}"
    fix_string_key epsHostedZoneId "${EPS_HOSTED_ZONE_ID}"
    fix_string_key cloudfrontCertArn "${CLOUDFRONT_CERT_ARN}"
    fix_string_key shortCloudfrontDomain "${SHORT_CLOUDFRONT_DOMAIN}"
    fix_string_key fullCloudfrontDomain "${FULL_CLOUDFRONT_DOMAIN}"
    fix_string_key fullCognitoDomain "${FULL_COGNITO_DOMAIN}"
    fix_string_key primaryOidcClientId "${PRIMARY_OIDC_CLIENT_ID}"
    fix_string_key primaryOidcTokenEndpoint "${PRIMARY_OIDC_TOKEN_ENDPOINT}"
    fix_string_key primaryOidcAuthorizeEndpoint "${PRIMARY_OIDC_AUTHORIZE_ENDPOINT}"
    fix_string_key primaryOidcIssuer "${PRIMARY_OIDC_ISSUER}"
    fix_string_key primaryOidcUserInfoEndpoint "${PRIMARY_OIDC_USERINFO_ENDPOINT}"
    fix_string_key primaryOidcjwksEndpoint "${PRIMARY_OIDC_JWKS_ENDPOINT}"

    if [ "$USE_MOCK_OIDC" == "true" ]; then
        fix_string_key mockOidcClientId "${MOCK_OIDC_CLIENT_ID}"
        fix_string_key mockOidcTokenEndpoint "${MOCK_OIDC_TOKEN_ENDPOINT}"
        fix_string_key mockOidcAuthorizeEndpoint "${MOCK_OIDC_AUTHORIZE_ENDPOINT}"
        fix_string_key mockOidcIssuer "${MOCK_OIDC_ISSUER}"
        fix_string_key mockOidcUserInfoEndpoint "${MOCK_OIDC_USERINFO_ENDPOINT}"
        fix_string_key mockOidcjwksEndpoint "${MOCK_OIDC_JWKS_ENDPOINT}"
        fix_string_key apigeeMockTokenEndpoint "${APIGEE_MOCK_TOKEN_ENDPOINT}"
    fi
    fix_boolean_number_key useMockOidc "${USE_MOCK_OIDC}"
    fix_string_key apigeeApiKey "${APIGEE_API_KEY}"
    fix_string_key apigeeCIS2TokenEndpoint "${APIGEE_CIS2_TOKEN_ENDPOINT}"
    fix_string_key apigeePrescriptionsEndpoint "${APIGEE_PRESCRIPTION_ENDPOINT}"
    fix_string_key apigeePersonalDemographicsEndpoint "${APIGEE_PERSONAL_DEMOGRAPHICS_ENDPOINT}"
    fix_string_key jwtKid "${JWT_KID}"
    fix_string_key ROLE_ID "${ROLE_ID}"
else
    echo "unknown cdk app name"
    exit 1
fi
