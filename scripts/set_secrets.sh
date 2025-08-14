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

set_environment_secret() {
    secret_name=$1
    secret_value=$2
    environment=$3
    if [ -z "${secret_value}" ]; then
        echo "value passed for secret ${secret_name} is unset or set to the empty string. Not setting"
        return 0
    fi
    echo
    echo "*****************************************"
    echo
    echo "setting value for ${secret_name} in environment ${environment}"
    echo "secret_value: ${secret_value}"
    read -r -p "Press Enter to set secret or ctrl+c to exit"
    gh secret set "${secret_name}" \
        --repo NHSDigital/eps-prescription-tracker-ui \
        --env "${environment}" \
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

set_environment_private_key_secret() {
    secret_name=$1
    private_key_file_name=$2
    environment=$3

    private_key=$(cat "${private_key_file_name}")
    if [ -z "${private_key}" ]; then
        echo "private_key is unset or set to the empty string"
        exit 1
    fi

    set_environment_secret "${secret_name}" "${private_key}" "${environment}"
}

get_deploy_role() {
    environment=$1
    # shellcheck disable=SC2016
    CLOUD_FORMATION_DEPLOY_ROLE=$(aws cloudformation list-exports \
        --profile prescription-"${environment}" \
        --query 'Exports[?Name==`ci-resources:CloudFormationDeployRole`].Value' \
        --output text)

    echo "${CLOUD_FORMATION_DEPLOY_ROLE}"
}

get_cdk_image_pull_role() {
    environment=$1
    # shellcheck disable=SC2016
    CDK_PULL_IMAGE_ROLE=$(aws cloudformation list-exports \
    --profile prescription-"${environment}" \
    --query 'Exports[?Name==`ci-resources:CDKPullImageRole`].Value' \
    --output text)

    echo "${CDK_PULL_IMAGE_ROLE}"
}

check_gh_logged_in

# recovery
DEV_DEPLOY_ROLE=$(get_deploy_role recovery)
DEV_CDK_PULL_IMAGE_ROLE=$(get_cdk_image_pull_role recovery)

set_environment_secret CDK_PULL_IMAGE_ROLE "${DEV_CDK_PULL_IMAGE_ROLE}" recovery
set_environment_secret CLOUD_FORMATION_DEPLOY_ROLE "${DEV_DEPLOY_ROLE}" recovery
set_environment_secret CIS2_OIDC_CLIENT_ID "${DEV_CIS2_OIDC_CLIENT_ID}" recovery
set_environment_secret MOCK_OIDC_CLIENT_ID "${DEV_MOCK_CLIENT_ID}" recovery
set_environment_private_key_secret JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-dev.pem" recovery
set_environment_secret APIGEE_API_KEY "${APIGEE_RECOVERY_API_KEY}" recovery
set_environment_secret APIGEE_API_SECRET "${APIGEE_RECOVERY_API_SECRET}" recovery
set_environment_secret APIGEE_DOHS_API_KEY "${APIGEE_PTL_DOHS_API_KEY}" recovery
set_environment_secret CLOUDFRONT_ORIGIN_CUSTOM_HEADER "$(uuidgen)" recovery
set_environment_private_key_secret REGRESSION_TESTS_PEM ".secrets/eps-regression-testing.private-key.pem" recovery

# dev and dev-pr
DEV_DEPLOY_ROLE=$(get_deploy_role dev)
DEV_CDK_PULL_IMAGE_ROLE=$(get_cdk_image_pull_role dev)

set_environment_secret CDK_PULL_IMAGE_ROLE "${DEV_CDK_PULL_IMAGE_ROLE}" dev-pr
set_environment_secret CLOUD_FORMATION_DEPLOY_ROLE "${DEV_DEPLOY_ROLE}" dev-pr
set_environment_secret CIS2_OIDC_CLIENT_ID "${DEV_CIS2_OIDC_CLIENT_ID}" dev-pr
set_environment_secret MOCK_OIDC_CLIENT_ID "${DEV_MOCK_CLIENT_ID}" dev-pr
set_environment_private_key_secret JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-dev.pem" dev-pr
set_environment_secret APIGEE_API_KEY "${APIGEE_DEV_API_KEY}" dev-pr
set_environment_secret APIGEE_API_SECRET "${APIGEE_DEV_API_SECRET}" dev-pr
set_environment_secret APIGEE_DOHS_API_KEY "${APIGEE_PTL_DOHS_API_KEY}" dev-pr
set_environment_secret CLOUDFRONT_ORIGIN_CUSTOM_HEADER "$(uuidgen)" dev-pr
set_environment_private_key_secret REGRESSION_TESTS_PEM ".secrets/eps-regression-testing.private-key.pem" dev-pr

set_repository_secret CDK_PULL_IMAGE_ROLE "${DEV_CDK_PULL_IMAGE_ROLE}" dependabot
set_repository_secret CLOUD_FORMATION_DEPLOY_ROLE "${DEV_DEPLOY_ROLE}" dependabot
set_repository_secret CIS2_OIDC_CLIENT_ID "${DEV_CIS2_OIDC_CLIENT_ID}" dependabot
set_repository_secret MOCK_OIDC_CLIENT_ID "${DEV_MOCK_CLIENT_ID}" dependabot
set_repository_private_key_secret JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-dev.pem" dependabot
set_repository_secret APIGEE_API_KEY "${APIGEE_DEV_API_KEY}" dependabot
set_repository_secret APIGEE_API_SECRET "${APIGEE_DEV_API_SECRET}" dependabot
set_repository_secret APIGEE_DOHS_API_KEY "${APIGEE_PTL_DOHS_API_KEY}" dependabot
set_repository_secret CLOUDFRONT_ORIGIN_CUSTOM_HEADER "$(uuidgen)" dependabot
set_repository_private_key_secret REGRESSION_TESTS_PEM ".secrets/eps-regression-testing.private-key.pem" dependabot

set_environment_secret CDK_PULL_IMAGE_ROLE "${DEV_CDK_PULL_IMAGE_ROLE}" dev
set_environment_secret CLOUD_FORMATION_DEPLOY_ROLE "${DEV_DEPLOY_ROLE}" dev
set_environment_secret CIS2_OIDC_CLIENT_ID "${DEV_CIS2_OIDC_CLIENT_ID}" dev
set_environment_secret MOCK_OIDC_CLIENT_ID "${DEV_MOCK_CLIENT_ID}" dev
set_environment_private_key_secret JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-dev.pem" dev
set_environment_secret APIGEE_API_KEY "${APIGEE_DEV_API_KEY}" dev
set_environment_secret APIGEE_API_SECRET "${APIGEE_DEV_API_SECRET}" dev
set_environment_secret APIGEE_DOHS_API_KEY "${APIGEE_PTL_DOHS_API_KEY}" dev
set_environment_secret CLOUDFRONT_ORIGIN_CUSTOM_HEADER "$(uuidgen)" dev
set_environment_private_key_secret REGRESSION_TESTS_PEM ".secrets/eps-regression-testing.private-key.pem" dev

QA_DEPLOY_ROLE=$(get_deploy_role qa)
QA_CDK_PULL_IMAGE_ROLE=$(get_cdk_image_pull_role qa)
set_environment_secret CDK_PULL_IMAGE_ROLE "${QA_CDK_PULL_IMAGE_ROLE}" qa
set_environment_secret CLOUD_FORMATION_DEPLOY_ROLE "${QA_DEPLOY_ROLE}" qa
set_environment_secret CIS2_OIDC_CLIENT_ID "${QA_CIS2_OIDC_CLIENT_ID}" qa
set_environment_secret MOCK_OIDC_CLIENT_ID "${QA_MOCK_CLIENT_ID}" qa
set_environment_private_key_secret JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-qa.pem" qa
set_environment_secret APIGEE_API_KEY "${APIGEE_QA_API_KEY}" qa
set_environment_secret APIGEE_API_SECRET "${APIGEE_QA_API_SECRET}" qa
set_environment_secret APIGEE_DOHS_API_KEY "${APIGEE_PTL_DOHS_API_KEY}" qa
set_environment_secret CLOUDFRONT_ORIGIN_CUSTOM_HEADER "$(uuidgen)" qa
set_environment_private_key_secret REGRESSION_TESTS_PEM ".secrets/eps-regression-testing.private-key.pem" qa

REF_DEPLOY_ROLE=$(get_deploy_role ref)
REF_CDK_PULL_IMAGE_ROLE=$(get_cdk_image_pull_role ref)
set_environment_secret CDK_PULL_IMAGE_ROLE "${REF_CDK_PULL_IMAGE_ROLE}" ref
set_environment_secret CLOUD_FORMATION_DEPLOY_ROLE "${REF_DEPLOY_ROLE}" ref
set_environment_secret CIS2_OIDC_CLIENT_ID "${QA_CIS2_OIDC_CLIENT_ID}" ref
set_environment_secret MOCK_OIDC_CLIENT_ID "${QA_MOCK_CLIENT_ID}" ref
set_environment_private_key_secret JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-ref.pem" ref
set_environment_secret APIGEE_API_KEY "${APIGEE_QA_API_KEY}" ref
set_environment_secret APIGEE_API_SECRET "${APIGEE_QA_API_SECRET}" ref
set_environment_secret APIGEE_DOHS_API_KEY "${APIGEE_PTL_DOHS_API_KEY}" ref
set_environment_secret CLOUDFRONT_ORIGIN_CUSTOM_HEADER "$(uuidgen)" ref
set_environment_private_key_secret REGRESSION_TESTS_PEM ".secrets/eps-regression-testing.private-key.pem" ref

INT_DEPLOY_ROLE=$(get_deploy_role int)
INT_CDK_PULL_IMAGE_ROLE=$(get_cdk_image_pull_role int)
set_environment_secret CDK_PULL_IMAGE_ROLE "${INT_CDK_PULL_IMAGE_ROLE}" int
set_environment_secret CLOUD_FORMATION_DEPLOY_ROLE "${INT_DEPLOY_ROLE}" int
set_environment_secret CIS2_OIDC_CLIENT_ID "${INT_CIS2_OIDC_CLIENT_ID}" int
set_environment_secret MOCK_OIDC_CLIENT_ID "${INT_MOCK_CLIENT_ID}" int
set_environment_private_key_secret JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-int.pem" int
set_environment_secret APIGEE_API_KEY "${APIGEE_INT_API_KEY}" int
set_environment_secret APIGEE_API_SECRET "${APIGEE_INT_API_SECRET}" int
set_environment_secret APIGEE_DOHS_API_KEY "${APIGEE_PTL_DOHS_API_KEY}" int
set_environment_secret CLOUDFRONT_ORIGIN_CUSTOM_HEADER "$(uuidgen)" int
set_environment_private_key_secret REGRESSION_TESTS_PEM ".secrets/eps-regression-testing.private-key.pem" int

PROD_DEPLOY_ROLE=$(get_deploy_role prod)
PROD_CDK_PULL_IMAGE_ROLE=$(get_cdk_image_pull_role prod)
set_environment_secret CDK_PULL_IMAGE_ROLE "${PROD_CDK_PULL_IMAGE_ROLE}" prod
set_environment_secret CLOUD_FORMATION_DEPLOY_ROLE "${PROD_DEPLOY_ROLE}" prod
set_environment_secret CIS2_OIDC_CLIENT_ID "${PROD_CIS2_OIDC_CLIENT_ID}" prod
set_environment_secret MOCK_OIDC_CLIENT_ID "${PROD_MOCK_CLIENT_ID}" prod
set_environment_private_key_secret JWT_PRIVATE_KEY ".secrets/eps-cpt-ui-prod.pem" prod
set_environment_secret APIGEE_API_KEY "${APIGEE_PROD_API_KEY}" prod
set_environment_secret APIGEE_API_SECRET "${APIGEE_PROD_API_SECRET}" prod
set_environment_secret APIGEE_DOHS_API_KEY "${APIGEE_PROD_DOHS_API_KEY}" prod
set_environment_secret CLOUDFRONT_ORIGIN_CUSTOM_HEADER "$(uuidgen)" prod
set_environment_private_key_secret REGRESSION_TESTS_PEM ".secrets/eps-regression-testing.private-key.pem" prod
