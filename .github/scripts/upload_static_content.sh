#!/usr/bin/env bash
set -e

if [ -z "${ROOT_PATH}" ]; then
    echo "ROOT_PATH is unset or set to the empty string"
    exit 1
fi

if [ -z "${SHARED_RESOURCES_STACK_NAME}" ]; then
    echo "SHARED_RESOURCES_STACK_NAME is unset or set to the empty string"
    exit 1
fi

staticBucketName=$(aws cloudformation list-exports --query "Exports[?Name=='$SHARED_RESOURCES_STACK_NAME:StaticContentBucket:bucketName'].Value" --output text)

if [ -z "${staticBucketName}" ]; then
    echo "could not retrieve staticBucketName"
    exit 1
fi

echo "Uploading static content from ${ROOT_PATH} to s3://${staticBucketName}"
aws s3 cp "${ROOT_PATH}/packages/staticContent/404.html" "s3://${staticBucketName}/404.html"
aws s3 cp "${ROOT_PATH}/packages/staticContent/jwks/dev/jwks.json" "s3://${staticBucketName}/jwks.json"
