#!/usr/bin/env bash

staticBucketName=$(aws cloudformation list-exports --region eu-west-2 --output json | jq -r '.Exports[] | select(.Name == "cpt-ui-shared-resources:StaticContentBucket:bucketName") | .Value' )

echo "staticBucketName: ${staticBucketName}"

root_path=../../.build

echo "ls root path"
ls $root_path

echo "ls -R root path packages"
ls -R ${root_path}/packages/staticContent

aws s3 cp "${root_path}/packages/staticContent/404.html" "${staticBucketName}/404.html"
aws s3 cp "${root_path}/packages/staticContent/jwks/dev/jwks.json" "${staticBucketName}/jwks.json" 
