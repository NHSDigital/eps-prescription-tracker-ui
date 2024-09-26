#!/usr/bin/env bash

# these should be retrieved using exports
GrantCloudFormationExecutionAccessIAMPolicy=arn:aws:iam::591291862413:policy/ci-resources-GrantCloudFormationExecutionAccessIAMPolicy-gdiAGlPPXYVZ
GrantCloudFormationExecutionAccessPolicyA=arn:aws:iam::591291862413:policy/ci-resources-GrantCloudFormationExecutionAccessPolicyA-C69lLvBMqN5E
GrantCloudFormationExecutionAccessPolicyB=arn:aws:iam::591291862413:policy/ci-resources-GrantCloudFormationExecutionAccessPolicyB-Yhazzqk3hi9H
GrantCloudFormationExecutionAccessPolicyC=arn:aws:iam::591291862413:policy/ci-resources-GrantCloudFormationExecutionAccessPolicyC-B5O11HpNZ1dl
# KMSKeyPolicy=arn:aws:iam::591291862413:policy/account-resources-UseArtifactBucketKMSKeyManagedPolicy-T1xeJJC1dsMk
GrantCloudFormationExecutionAccessPolicyD=arn:aws:iam::591291862413:policy/ab_cognito_test
# ArtifactBucketKeyArn=arn:aws:kms:eu-west-2:591291862413:key/91f11a0a-255d-4f25-9d5d-e2711d3c4b20

# this should be retrieved automatically
AWS_ACCOUNT_ID=591291862413

ALL_POLICIES=${GrantCloudFormationExecutionAccessIAMPolicy}
ALL_POLICIES="${ALL_POLICIES},${GrantCloudFormationExecutionAccessPolicyA}"
ALL_POLICIES="${ALL_POLICIES},${GrantCloudFormationExecutionAccessPolicyB}"
ALL_POLICIES="${ALL_POLICIES},${GrantCloudFormationExecutionAccessPolicyC}"
ALL_POLICIES="${ALL_POLICIES},${GrantCloudFormationExecutionAccessPolicyD}"
#ALL_POLICIES="${ALL_POLICIES},${KMSKeyPolicy}"


cdk bootstrap aws://${AWS_ACCOUNT_ID}/eu-west-2 \
  --bootstrap-customer-key \
  --cloudformation-execution-policies "${ALL_POLICIES}" 

#cdk bootstrap aws://${AWS_ACCOUNT_ID}/us-east-1 \
#  --cloudformation-execution-policies "${ALL_POLICIES}" 
