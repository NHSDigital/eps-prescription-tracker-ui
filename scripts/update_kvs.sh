#!/usr/bin/env bash

keyValueStore=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='"${{ inputs.SERVICE_NAME }}-stateless-resources:StaticRewriteKeyValueStor:Arn"'].Value" --output text)

newVersion=29fbf08_old

ETag=$(aws cloudfront-keyvaluestore describe-key-value-store \
    --kvs-arn="$keyValueStore" \
    --query ETag --output text)

existing_keys=$(aws cloudfront-keyvaluestore list-keys --kvs-arn "$keyValueStore" --query "Items[*].Key" --output text)

# Check if "version" key exists
if [[ "$existing_keys" == *"version"* ]]; then
  # Update the existing "version" key
  aws cloudfront-keyvaluestore update-keys \
    --if-match="${ETag}" \
    --kvs-arn "$keyValueStore" \
    --puts Key=version,Value="$newVersion"
  echo "Updated the 'version' key to $newVersion."
else
  # Insert a new "version" key
  aws cloudfront-keyvaluestore put-key \
    --if-match="${ETag}" \
    --key=version \
    --value="$newVersion "\
    --kvs-arn "$keyValueStore"
  echo "Inserted new 'version' key with value $newVersion."
fi
