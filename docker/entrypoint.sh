#!/usr/bin/env bash

source /home/cdkuser/.asdf/asdf.sh

epsZoneId=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-ZoneID") | .Value' | grep -o '[^:]*$')
epsDomain=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "eps-route53-resources:EPS-domain") | .Value' | grep -o '[^:]*$')
export epsZoneId
export epsDomain
make cdk-deploy
