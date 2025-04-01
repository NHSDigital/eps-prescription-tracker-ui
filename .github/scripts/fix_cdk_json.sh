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
        '. += {($key_name): $key_value}' "$OUTPUT_FILE_NAME" > "${TEMP_FILE}"
    mv "${TEMP_FILE}" "$OUTPUT_FILE_NAME"
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
        '. += {($key_name): $key_value}' "$OUTPUT_FILE_NAME" > "${TEMP_FILE}"
    mv "${TEMP_FILE}" "$OUTPUT_FILE_NAME"
}

OUTPUT_FILE_NAME=$1
if [ -z "${OUTPUT_FILE_NAME}" ]; then
    echo "OUTPUT_FILE_NAME value is unset or set to the empty string"
    exit 1
fi
echo "{}" > "$OUTPUT_FILE_NAME"
TEMP_FILE=$(mktemp)

# get some values from AWS
if [ -z "${EPS_DOMAIN_NAME}" ]; then
    EPS_DOMAIN_NAME=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-domain") | .Value')
fi
if [ -z "${EPS_HOSTED_ZONE_ID}" ]; then
    EPS_HOSTED_ZONE_ID=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-ZoneID") | .Value')
fi
if [ -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]; then
    CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation list-exports --output json | \
        jq \
        --arg EXPORT_NAME "${SERVICE_NAME}-stateless-resources:cloudfrontDistribution:Id" \
        -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
fi
if [ -z "${CLOUDFRONT_CERT_ARN}" ]; then
    CLOUDFRONT_CERT_ARN=$(aws cloudformation list-exports --region us-east-1 --output json | \
        jq \
        --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:cloudfrontCertificate:Arn" \
        -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
fi

if [ -z "${SHORT_CLOUDFRONT_DOMAIN}" ]; then
    SHORT_CLOUDFRONT_DOMAIN=$(aws cloudformation list-exports --region us-east-1 --output json | \
        jq \
        --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:shortCloudfrontDomain:Name" \
        -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
fi

if [ -z "${FULL_CLOUDFRONT_DOMAIN}" ]; then
    FULL_CLOUDFRONT_DOMAIN=$(aws cloudformation list-exports --region us-east-1 --output json | \
        jq \
        --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:fullCloudfrontDomain:Name" \
        -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
fi

if [ -z "${FULL_COGNITO_DOMAIN}" ]; then
    FULL_COGNITO_DOMAIN=$(aws cloudformation list-exports --region us-east-1 --output json | \
        jq \
        --arg EXPORT_NAME "${SERVICE_NAME}-us-certs:fullCognitoDomain:Name" \
        -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
fi

if [ -z "${RUM_LOG_GROUP_ARN}" ]; then
    RUM_LOG_GROUP_ARN=$(aws cloudformation list-exports --region eu-west-2 --output json | \
        jq \
        --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:logGroup:arn" \
        -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
fi

if [ -z "${RUM_APP_NAME}" ]; then
    RUM_APP_NAME=$(aws cloudformation list-exports --region eu-west-2 --output json | \
        jq \
        --arg EXPORT_NAME "${SERVICE_NAME}-stateful-resources:rum:rumApp:Name" \
        -r '.Exports[] | select(.Name == $EXPORT_NAME) | .Value')
fi

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
    if [ -n "${RUM_APP_NAME}" ]; then
        fix_string_key rumAppName "${RUM_APP_NAME}"
    fi
    fix_boolean_number_key allowLocalhostAccess "${ALLOW_LOCALHOST_ACCESS}"

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
