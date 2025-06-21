#!/usr/bin/env bash

declare -a arr=("cdk"
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
                "trackerUserInfoLambda"
                )

for i in "${arr[@]}"
do
   echo
   echo "*********************************************"
   echo "$i"
   cd "packages/$i" || exit
   npx depcheck
   cd - || exit
   echo
   # or do whatever with individual element of the array
done
