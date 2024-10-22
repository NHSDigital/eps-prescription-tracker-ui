#!/usr/bin/env bash
set -e

# define various functions
upload_static_content() {
    echo "**********************************************"
    echo "Uploading static content"

    staticBucketName=$(aws cloudformation list-exports --query "Exports[?Name=='$STATEFUL_STACK_NAME:StaticContentBucket:bucketName'].Value" --output text)
    if [ -z "${staticBucketName}" ]; then
        echo "could not retrieve staticBucketName"
        exit 1
    fi

    echo "ROOT_PATH        : ${ROOT_PATH}"
    echo "staticBucketName : ${staticBucketName}"

    echo "Uploading static pages"
    aws s3 cp "${ROOT_PATH}/packages/staticContent/404.html" "s3://${staticBucketName}/404.html"
    aws s3 cp "${ROOT_PATH}/packages/staticContent/500.html" "s3://${staticBucketName}/500.html"
    aws s3 cp "${ROOT_PATH}/packages/staticContent/jwks/dev/jwks.json" "s3://${staticBucketName}/jwks.json"

    echo "Uploading static compiled website"
    aws s3 cp --recursive "${ROOT_PATH}/packages/cpt-ui/out/" "s3://${staticBucketName}/${VERSION_NUMBER}/" 
}

deploy_stateful_stack_uk() {
    echo "**********************************************"
    echo "Deploying stateful stack uk"
    cloudfrontDistributionId=$(aws cloudformation list-exports --region us-east-1 --query "Exports[?Name=='$STATEFUL_STACK_NAME:cloudfrontDistributionId:Id'].Value" --output text)

    echo "STATEFUL_STACK_NAME            : ${STATEFUL_STACK_NAME}"
    echo "VERSION_NUMBER                 : ${VERSION_NUMBER}"
    echo "COMMIT_ID                      : ${COMMIT_ID}"
    echo "LOG_RETENTION_IN_DAYS          : ${LOG_RETENTION_IN_DAYS}"
    echo "cloudfrontDistributionId       : ${cloudfrontDistributionId}"
    echo "ALLOW_AUTO_DELETE_OBJECTS      : ${ALLOW_AUTO_DELETE_OBJECTS}"
    echo "STATEFUL_STACK_UK_CDK_APP_PATH : ${STATEFUL_STACK_UK_CDK_APP_PATH}"

    jq \
    --arg stackName "${STATEFUL_STACK_NAME}" \
    --arg VERSION_NUMBER "${VERSION_NUMBER}" \
    --arg COMMIT_ID "${COMMIT_ID}" \
    --arg logRetentionInDays "${LOG_RETENTION_IN_DAYS}" \
    --arg cloudfrontDistributionId "${cloudfrontDistributionId}" \
    --arg allowAutoDeleteObjects "${ALLOW_AUTO_DELETE_OBJECTS}" \
    '.context += {
    "cloudfrontDistributionId": $cloudfrontDistributionId,
    "allowAutoDeleteObjects": $allowAutoDeleteObjects,
    "stackName": $stackName, 
    "VERSION_NUMBER": $VERSION_NUMBER, 
    "COMMIT_ID": $COMMIT_ID,
    "logRetentionInDays": $logRetentionInDays}' \
    cdk.original.json > cdk.json

    export AWS_REGION=eu-west-2
    echo "Running cdk diff"
    npx cdk diff \
		--app "npx ts-node --prefer-ts-exts ${STATEFUL_STACK_UK_CDK_APP_PATH}"

    echo "Running cdk deploy"
    npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts ${STATEFUL_STACK_UK_CDK_APP_PATH}" \
        --all \
        --require-approval=never \
        --ci true
}

deploy_stateful_stack_us() {
    echo "**********************************************"
    echo "Deploying stateful stack us"

    # shellcheck disable=SC2140
    epsDomainName=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='"eps-route53-resources:EPS-domain"'].Value" --output text)
    # shellcheck disable=SC2140
    epsHostedZoneId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='"eps-route53-resources:EPS-ZoneID"'].Value" --output text)
    staticBucketArn=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='$STATEFUL_STACK_NAME:StaticContentBucket:Arn'].Value" --output text)
    staticContentBucketKmsKeyArn=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='$STATEFUL_STACK_NAME:staticContentBucketKmsKey:Arn'].Value" --output text)

    echo "STATEFUL_STACK_NAME            : ${STATEFUL_STACK_NAME}"
    echo "VERSION_NUMBER                 : ${VERSION_NUMBER}"
    echo "COMMIT_ID                      : ${COMMIT_ID}"
    echo "LOG_RETENTION_IN_DAYS          : ${LOG_RETENTION_IN_DAYS}"
    echo "epsDomainName                  : ${epsDomainName}"
    echo "epsHostedZoneId                : ${epsHostedZoneId}"
    echo "staticBucketArn                : ${staticBucketArn}"
    echo "staticContentBucketKmsKeyArn   : ${staticContentBucketKmsKeyArn}"
    echo "ALLOW_AUTO_DELETE_OBJECTS      : ${ALLOW_AUTO_DELETE_OBJECTS}"
    echo "STATEFUL_STACK_US_CDK_APP_PATH : ${STATEFUL_STACK_US_CDK_APP_PATH}"

    jq \
    --arg stackName "${STATEFUL_STACK_NAME}" \
    --arg VERSION_NUMBER "${VERSION_NUMBER}" \
    --arg COMMIT_ID "${COMMIT_ID}" \
    --arg logRetentionInDays "${LOG_RETENTION_IN_DAYS}" \
    --arg epsDomainName "${epsDomainName}" \
    --arg epsHostedZoneId "${epsHostedZoneId}" \
    --arg staticBucketArn "${staticBucketArn}" \
    --arg staticContentBucketKmsKeyArn "${staticContentBucketKmsKeyArn}" \
    --arg allowAutoDeleteObjects "${ALLOW_AUTO_DELETE_OBJECTS}" \
    '.context += {
    "epsDomainName": $epsDomainName,
    "epsHostedZoneId": $epsHostedZoneId,
    "staticBucketArn": $staticBucketArn,
    "staticContentBucketKmsKeyArn": $staticContentBucketKmsKeyArn,
    "auditLoggingBucket": $auditLoggingBucket,
    "allowAutoDeleteObjects": $allowAutoDeleteObjects,
    "stackName": $stackName, 
    "VERSION_NUMBER": $VERSION_NUMBER, 
    "COMMIT_ID": $COMMIT_ID,
    "logRetentionInDays": $logRetentionInDays}' \
    cdk.original.json > cdk.json

    export AWS_REGION=us-east-1
    npx cdk diff \
		--app "npx ts-node --prefer-ts-exts ${STATEFUL_STACK_US_CDK_APP_PATH}"

    npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts ${STATEFUL_STACK_US_CDK_APP_PATH}" \
        --all \
        --require-approval=never \
        --ci true
}

deploy_stateless_stack() {
    echo "**********************************************"
    echo "Deploying stateless stack"

    echo "STATELESS_STACK_NAME         : ${STATELESS_STACK_NAME}"
    echo "VERSION_NUMBER               : ${VERSION_NUMBER}"
    echo "COMMIT_ID                    : ${COMMIT_ID}"
    echo "STATELESS_STACK_CDK_APP_PATH : ${STATELESS_STACK_CDK_APP_PATH}"

    jq \
    --arg stackName "${STATELESS_STACK_NAME}" \
    --arg VERSION_NUMBER "${VERSION_NUMBER}" \
    --arg COMMIT_ID "${COMMIT_ID}" \
    --arg logRetentionInDays "${LOG_RETENTION_IN_DAYS}" \
    '.context += {
    "VERSION_NUMBER": $VERSION_NUMBER, 
    "COMMIT_ID": $COMMIT_ID,
    "logRetentionInDays": $logRetentionInDays}' \
    cdk.original.json > cdk.json

    export AWS_REGION=eu-west-2
    npx cdk diff \
		--app "npx ts-node --prefer-ts-exts ${STATELESS_STACK_CDK_APP_PATH}"

    npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts ${STATELESS_STACK_CDK_APP_PATH}" \
        --all \
        --require-approval=never \
        --ci true
}

# check we have correct variables passed in
if [ -z "${ROOT_PATH}" ]; then
    echo "ROOT_PATH is unset or set to the empty string"
    exit 1
fi

if [ -z "${STATEFUL_STACK_NAME}" ]; then
    echo "STATEFUL_STACK_NAME is unset or set to the empty string"
    exit 1
fi

if [ -z "${STATELESS_STACK_NAME}" ]; then
    echo "STATELESS_STACK_NAME is unset or set to the empty string"
    exit 1
fi

if [ -z "${VERSION_NUMBER}" ]; then
    echo "VERSION_NUMBER is unset or set to the empty string"
    exit 1
fi

if [ -z "${COMMIT_ID}" ]; then
    echo "COMMIT_ID is unset or set to the empty string"
    exit 1
fi

if [ -z "${LOG_RETENTION_IN_DAYS}" ]; then
    echo "LOG_RETENTION_IN_DAYS is unset or set to the empty string"
    exit 1
fi

if [ -z "${ALLOW_AUTO_DELETE_OBJECTS}" ]; then
    echo "ALLOW_AUTO_DELETE_OBJECTS is unset or set to the empty string"
    exit 1
fi

if [ -z "${STATEFUL_STACK_UK_CDK_APP_PATH}" ]; then
    echo "STATEFUL_STACK_UK_CDK_APP_PATH is unset or set to the empty string"
    exit 1
fi

if [ -z "${STATEFUL_STACK_US_CDK_APP_PATH}" ]; then
    echo "STATEFUL_STACK_US_CDK_APP_PATH is unset or set to the empty string"
    exit 1
fi

if [ -z "${STATELESS_STACK_CDK_APP_PATH}" ]; then
    echo "STATELESS_STACK_CDK_APP_PATH is unset or set to the empty string"
    exit 1
fi

# move to root directory and move cdk.json to original file
cd "${ROOT_PATH}"
mv cdk.json cdk.original.json

# check if we have deployed yet
# if we have not we will need to deploy the stateful stack and stateless stack again to set policies correctly
cloudfrontDistributionId=$(aws cloudformation list-exports --region us-east-1 --query "Exports[?Name=='$STATEFUL_STACK_NAME:cloudfrontDistributionId:Id'].Value" --output text)
if [ -z "${cloudfrontDistributionId}" ]; then
    FIRST_DEPLOYMENT=true
else
    FIRST_DEPLOYMENT=false
fi

deploy_stateful_stack_uk
upload_static_content
deploy_stateless_stack
deploy_stateful_stack_us
if [ "$FIRST_DEPLOYMENT" == "true" ]; then
    echo "**********************************************"
    echo "First deployment so running deploy_stateful_stack_uk and deploy_stateless_stack again to fix permissions"
    deploy_stateful_stack_uk
    deploy_stateless_stack
fi
