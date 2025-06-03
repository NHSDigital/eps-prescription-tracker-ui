#!/usr/bin/env bash

declare -a arr=("auth_demo" 
                "cdk"
                "CIS2SignOutLambda"
                "cognito"
                "cpt-ui"
                "patientSearchLambda"
                "prescriptionListLambda"
                "common/testing"
                "common/lambdaUtils"
                "common/middyErrorHandler"
                "common/pdsClient"
                "common/authFunctions"
                "common/dynamoFunctions"
                "common/commonTypes"
                "selectedRoleLambda"
                "staticContent"
                "trackerUserInfoLambda"
                )

for i in "${arr[@]}"
do
   echo "$i"
   cd "packages/$i"
   npx depcheck
   cd -
   # or do whatever with individual element of the array
done
