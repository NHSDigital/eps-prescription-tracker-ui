#!/usr/bin/env bash

check_gh_logged_in() {
    if ! gh auth status >/dev/null 2>&1; then
        echo "You need to login using gh auth login"
        exit 1
    fi
}

set_secrets() {
    gh secret set PTL_PRIMARY_OIDC_CLIENT_ID \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "${Cis2PTLClientID}"

    gh secret set PTL_PRIMARY_OIDC_CLIENT_SECRET \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$Cis2PTLClientSecret"

    gh secret set PTL_CIS2_PRIVATE_KEY \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$private_key"

    gh secret set PTL_PRIMARY_OIDC_CLIENT_ID \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app dependabot \
        --body "${Cis2PTLClientID}"

    gh secret set PTL_PRIMARY_OIDC_CLIENT_SECRET \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app dependabot \
        --body "$Cis2PTLClientSecret"

    gh secret set PTL_CIS2_PRIVATE_KEY \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app dependabot \
        --body "$private_key"

    # mock secrets

    gh secret set PTL_MOCK_CLIENT_ID \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockClientID"

    gh secret set PTL_MOCK_CLIENT_SECRET \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockClientSecret"

    gh secret set PTL_MOCK_CLIENT_ID \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app dependabot \
        --body "$mockClientID"

    gh secret set PTL_MOCK_CLIENT_SECRET \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app dependabot \
        --body "$mockClientSecret"
}

if [ -z "${Cis2PTLClientID}" ]; then
    echo "Cis2PTLClientID is unset or set to the empty string"
    exit 1
fi
if [ -z "${Cis2PTLClientSecret}" ]; then
    echo "Cis2PTLClientSecret is unset or set to the empty string"
    exit 1
fi
if [ -z "${mockClientID}" ]; then
    echo "mockClientID is unset or set to the empty string"
    exit 1
fi
if [ -z "${mockClientSecret}" ]; then
    echo "mockClientSecret is unset or set to the empty string"
    exit 1
fi

private_key=$(cat .secrets/eps-cpt-ui-test.pem)
if [ -z "${private_key}" ]; then
    echo "private_key is unset or set to the empty string"
    exit 1
fi
check_gh_logged_in
set_secrets
