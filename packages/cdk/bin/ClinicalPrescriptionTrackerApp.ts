#!/usr/bin/env node
import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import {ClinicalPrescriptionTrackerStack} from "../stacks/clinicalPrescriptionTrackerStack"
import {USCertificatesStack} from "../stacks/USCertificatesStack"
import {Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"

const app = new cdk.App()

const stackName = app.node.tryGetContext("stackName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")

// add cdk-nag to everything
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

// add tags to everything
Tags.of(app).add("version", version)
Tags.of(app).add("stackName", stackName)
Tags.of(app).add("commit", commit)

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
