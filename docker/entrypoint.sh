#!/usr/bin/env bash

# shellcheck source=/dev/null
source /home/cdkuser/.asdf/asdf.sh

epsZoneId=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-ZoneID") | .Value' | grep -o '[^:]*$')
epsDomain=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-domain") | .Value' | grep -o '[^:]*$')
export epsZoneId
export epsDomain
export REQUIRE_APPROVAL=never
if [ "${SHOW_DIFF}" = "true" ]
then
    make cdk-diff
fi
if [ "${DEPLOY_CODE}" = "true" ]
then
    make cdk-deploy
fi
