#!/bin/sh

PrimaryUserPoolId=$(aws cloudformation list-exports --query "Exports[?Name=='${stack_name}:Cognito:PrimaryUserPoolId'].Value" --output text)
PrimaryUserPoolClientId=$(aws cloudformation list-exports --query "Exports[?Name=='${stack_name}:Cognito:PrimaryUserPoolClientId'].Value" --output text)
HostedLoginDomain=$(aws cloudformation list-exports --query "Exports[?Name=='${stack_name}:Cognito:HostedLoginDomain'].Value" --output text)

echo "PrimaryUserPoolId: ${PrimaryUserPoolId}"
echo "PrimaryUserPoolClientId: ${PrimaryUserPoolClientId}"
echo "HostedLoginDomain: ${HostedLoginDomain}"
