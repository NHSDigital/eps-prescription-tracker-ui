#!/usr/bin/env bash

check_gh_logged_in() {
    if ! gh auth status >/dev/null 2>&1; then
        echo "You need to login using gh auth login"
        exit 1
    fi
}

set_repository_secret() {
    secret_name=$1
    secret_value=$2
    app=$3
    if [ -z "${secret_value}" ]; then
        echo "value passed for secret ${secret_name} is unset or set to the empty string. Not setting"
        return 0
    fi
    echo
    echo "*****************************************"
    echo
    echo "setting value for ${secret_name}"
    echo "secret_value: ${secret_value}"
    read -r -p "Press Enter to set secret or ctrl+c to exit"
    gh secret set "${secret_name}" \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app "${app}" \
        --body "${secret_value}"
}

set_repository_private_key_secret() {
    secret_name=$1
    private_key_file_name=$2
    github_app=$3

    private_key=$(cat "${private_key_file_name}")
    if [ -z "${private_key}" ]; then
        echo "private_key is unset or set to the empty string"
        exit 1
    fi

    set_repository_secret "${secret_name}" "${private_key}" "${github_app}"
}

private_key=$(cat .secrets/eps-cpt-ui-test.pem)
if [ -z "${private_key}" ]; then
    echo "private_key is unset or set to the empty string"
    exit 1
fi
check_gh_logged_in

# these are from cis2 client set up
set_repository_secret DEV_CIS2_OIDC_CLIENT_ID "${DEV_CIS2_OIDC_CLIENT_ID}" "actions"
set_repository_secret REF_CIS2_OIDC_CLIENT_ID "${REF_CIS2_OIDC_CLIENT_ID}" "actions"
set_repository_secret QA_CIS2_OIDC_CLIENT_ID "${QA_CIS2_OIDC_CLIENT_ID}" "actions"
set_repository_secret INT_CIS2_OIDC_CLIENT_ID "${INT_CIS2_OIDC_CLIENT_ID}" "actions"

# these are locally generated private keys
# the public part of this keypair should be put in packages/staticContent/jwks/{env}/jwks.json
set_repository_private_key_secret DEV_JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-dev.pem" "actions"
set_repository_private_key_secret REF_JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-ref.pem" "actions"
set_repository_private_key_secret QA_JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-qa.pem" "actions"
set_repository_private_key_secret INT_JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-int.pem" "actions"

# need to set these for dependabot as well for dev
set_repository_secret DEV_CIS2_OIDC_CLIENT_ID "${DEV_CIS2_OIDC_CLIENT_ID}" "dependabot"
set_repository_private_key_secret DEV_JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-dev.pem" "dependabot"

# these are from the keycloak setup of the mock client
set_repository_secret DEV_MOCK_CLIENT_ID "${DEV_MOCK_CLIENT_ID}" "actions"
set_repository_secret DEV_MOCK_CLIENT_ID "${DEV_MOCK_CLIENT_ID}" "dependabot"

set_repository_secret QA_MOCK_CLIENT_ID "${QA_MOCK_CLIENT_ID}" "actions"
set_repository_secret REF_MOCK_CLIENT_ID "${REF_MOCK_CLIENT_ID}" "actions"

# these are from the apigee client set up
set_repository_secret APIGEE_DEV_API_KEY "${APIGEE_DEV_API_KEY}" "actions"
set_repository_secret APIGEE_DEV_API_KEY "${APIGEE_DEV_API_KEY}" "dependabot"
set_repository_secret APIGEE_REF_API_KEY "${APIGEE_REF_API_KEY}" "actions"
set_repository_secret APIGEE_QA_API_KEY "${APIGEE_QA_API_KEY}" "actions"
set_repository_secret APIGEE_INT_API_KEY "${APIGEE_INT_API_KEY}" "actions"
