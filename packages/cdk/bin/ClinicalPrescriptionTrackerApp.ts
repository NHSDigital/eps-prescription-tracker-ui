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

const ClinicalPrescriptionTracker = new ClinicalPrescriptionTrackerStack(app, "ClinicalPrescriptionTrackerStack", {
  crossRegionReferences: true,
  env: {region: "eu-west-2"},
  stackName: stackName,
  userPoolTLSCertificateArn: USCertificates.userPoolTlsCertificateArn
})

// do a synth to add cross region stuff
app.synth()

// add metadata to lambda
const writerProvider = USCertificates.node.findChild("Custom::CrossRegionExportWriterCustomResourceProvider")
const writerLambda = writerProvider.node.findChild("Handler") as cdk.CfnResource
const writerRole = writerProvider.node.findChild("Role") as cdk.CfnResource
writerLambda.cfnOptions.metadata = (
  {
    ...writerLambda.cfnOptions.metadata,
    "guard": {
      "SuppressedRules": [
        "LAMBDA_DLQ_CHECK",
        "LAMBDA_INSIDE_VPC",
        "LAMBDA_CONCURRENCY_CHECK"
      ]
    }
  }
)
writerRole.cfnOptions.metadata = (
  {
    ...writerLambda.cfnOptions.metadata,
    "guard": {
      "SuppressedRules": [
        "IAM_NO_INLINE_POLICY_CHECK"
      ]
    }
  }
)

// eslint-disable-next-line max-len
const readerProvider = ClinicalPrescriptionTracker.node.findChild("Custom::CrossRegionExportReaderCustomResourceProvider") as cdk.CustomResourceProvider
const readerLambda = readerProvider.node.findChild("Handler") as cdk.CfnResource
const readerRole = readerProvider.node.findChild("Role") as cdk.CfnResource
readerLambda.cfnOptions.metadata = (
  {
    ...readerLambda.cfnOptions.metadata,
    "guard": {
      "SuppressedRules": [
        "LAMBDA_DLQ_CHECK",
        "LAMBDA_INSIDE_VPC",
        "LAMBDA_CONCURRENCY_CHECK"
      ]
    }
  }
)
readerRole.cfnOptions.metadata = (
  {
    ...readerRole.cfnOptions.metadata,
    "guard": {
      "SuppressedRules": [
        "IAM_NO_INLINE_POLICY_CHECK"
      ]
    }
  }
)

// do a synth again with force to include the added metadata
app.synth({
  force: true
})
