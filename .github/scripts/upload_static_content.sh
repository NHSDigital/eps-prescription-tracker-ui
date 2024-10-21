#!/usr/bin/env bash

staticBucketName=$(aws cloudformation list-exports --region eu-west-2 --output json | jq -r '.Exports[] | select(.Name == "cpt-ui-shared-resources:StaticContentBucket:bucketName") | .Value' )

root_path=../../.build
aws s3 cp "${root_path}/packages/staticContent/404.html" "${staticBucketName}/404.html"
aws s3 cp "${root_path}/build/packages/staticContent/jwks/dev/jwks.json" "${staticBucketName}/jwks.json" 
