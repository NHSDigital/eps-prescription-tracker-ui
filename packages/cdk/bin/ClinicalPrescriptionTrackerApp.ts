#!/usr/bin/env node
import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import {ClinicalPrescriptionTrackerStack} from "../stacks/clinicalPrescriptionTrackerStack"
import {USCertificatesStack} from "../stacks/USCertificatesStack"
import {Aspects} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"
const app = new cdk.App()
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

const stackName = app.node.tryGetContext("stackName")
const USCertificates = new USCertificatesStack(app, "USCertificates", {
  env: {region: "us-east-1"},
  stackName: stackName
})

new ClinicalPrescriptionTrackerStack(app, "ClinicalPrescriptionTrackerStack", {
  crossRegionReferences: true,
  env: {region: "eu-west-2"},
  stackName: stackName,
  userPoolTLSCertificateArn: USCertificates.userPoolTlsCertificateArn
})
app.synth()
