#!/usr/bin/env bash
set -e

if [ -z "${ROOT_PATH}" ]; then
    echo "ROOT_PATH is unset or set to the empty string"
    exit 1
fi
staticBucketName=$(aws cloudformation list-exports --region eu-west-2 --output json | jq -r '.Exports[] | select(.Name == "cpt-ui-shared-resources:StaticContentBucket:bucketName") | .Value' )

aws s3 cp "${ROOT_PATH}/packages/staticContent/404.html" "s3://${staticBucketName}/404.html"
aws s3 cp "${ROOT_PATH}/packages/staticContent/jwks/dev/jwks.json" "s3://${staticBucketName}/jwks.json"
