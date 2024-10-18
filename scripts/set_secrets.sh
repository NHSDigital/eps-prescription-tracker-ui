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
        --body "$Cis2PTLClientID"

    gh secret set primaryOidClientSecret \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$Cis2PTLClientSecret"

    gh secret set primaryOidcIssuer \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$Cis2PTLIssuer"

    gh secret set primaryOidcAuthorizeEndpoint \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$Cis2PTLAuthorizeEndpoint"

    gh secret set primaryOidcTokenEndpoint \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$Cis2PTLTokenEndpoint"

    gh secret set primaryOidcUserInfoEndpoint \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$Cis2PTLUserInfoEndpoint"

    gh secret set primaryOidcjwksEndpoint \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$Cis2PTLJWKSEndpoint"


    # mock secrets

    gh secret set mockClientID \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockClientID"

    gh secret set mockClientSecret \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockClientSecret"

    gh secret set mockIssuer \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockIssuer"

    gh secret set mockAuthorizeEndpoint \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockAuthorizeEndpoint"

    gh secret set mockTokenEndpoint \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockTokenEndpoint"

    gh secret set mockUserInfoEndpoint \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockUserInfoEndpoint"

    gh secret set mockJWKSEndpoint \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --app actions \
        --body "$mockJWKSEndpoint"

}
check_gh_logged_in
set_secrets
