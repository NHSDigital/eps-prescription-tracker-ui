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


# this is a locally generated private key
# the public part of this keypair should be put in packages/staticContent/jwks/jwks.json
private_key=$(cat .secrets/eps-cpt-ui-test.pem)
if [ -z "${private_key}" ]; then
    echo "private_key is unset or set to the empty string"
    exit 1
fi
check_gh_logged_in
set_secrets

# these are from cis2 client set up
set_repository_secret PTL_PRIMARY_OIDC_CLIENT_ID "${PTL_PRIMARY_OIDC_CLIENT_ID}" "actions"
set_repository_secret PTL_PRIMARY_OIDC_CLIENT_SECRET "${PTL_PRIMARY_OIDC_CLIENT_SECRET}" "actions"

# this is a locally generated private key
# the public part of this keypair should be put in packages/staticContent/jwks/jwks.json
set_repository_secret PTL_CIS2_PRIVATE_KEY "${private_key}" "actions"


# need to set these for dependabot as well
set_repository_secret PTL_PRIMARY_OIDC_CLIENT_ID "${PTL_PRIMARY_OIDC_CLIENT_ID}" "dependabot"
set_repository_secret PTL_PRIMARY_OIDC_CLIENT_SECRET "${PTL_PRIMARY_OIDC_CLIENT_SECRET}" "dependabot"
set_repository_secret PTL_CIS2_PRIVATE_KEY "${private_key}" "dependabot"

# these are from the keycloak setup of the mock client
set_repository_secret PTL_MOCK_CLIENT_ID "${PTL_MOCK_CLIENT_ID}" "actions"
set_repository_secret PTL_MOCK_CLIENT_SECRET "${PTL_MOCK_CLIENT_SECRET}" "actions"
set_repository_secret PTL_MOCK_CLIENT_ID "${PTL_MOCK_CLIENT_ID}" "dependabot"
set_repository_secret PTL_MOCK_CLIENT_SECRET "${PTL_MOCK_CLIENT_SECRET}" "dependabot"

# these are from the apigee client set up
set_repository_secret APIGEE_DEV_API_KEY "${APIGEE_DEV_API_KEY}" "actions"
set_repository_secret APIGEE_DEV_API_KEY "${APIGEE_DEV_API_KEY}" "dependabot"
set_repository_secret APIGEE_REF_API_KEY "${APIGEE_REF_API_KEY}" "actions"
set_repository_secret APIGEE_QA_API_KEY "${APIGEE_QA_API_KEY}" "actions"
set_repository_secret APIGEE_INT_API_KEY "${APIGEE_INT_API_KEY}" "actions"
