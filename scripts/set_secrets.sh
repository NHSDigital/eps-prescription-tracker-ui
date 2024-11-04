#!/usr/bin/env bash

check_gh_logged_in() {
    if ! gh auth status >/dev/null 2>&1; then
        echo "You need to login using gh auth login"
        exit 1
    fi
}

set_secrets() {
    gh secret set primaryOidcClientId \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "${Cis2PTLClientID}"

    gh secret set primaryOidClientSecret \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$Cis2PTLClientSecret"

    # mock secrets

    gh secret set mockClientID \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockClientID"

    gh secret set mockClientSecret \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
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

check_gh_logged_in
set_secrets
