#!/usr/bin/env bash

# retry aws commands
AWS_MAX_ATTEMPTS=20
export AWS_MAX_ATTEMPTS

dev_tag=$(aws cloudformation describe-stacks --stack-name cpt-ui-stateful-resources --query "Stacks[0].Tags[?Key=='version'].Value" --output text)

echo "DEV_TAG=${dev_tag}" >> "$GITHUB_ENV"
