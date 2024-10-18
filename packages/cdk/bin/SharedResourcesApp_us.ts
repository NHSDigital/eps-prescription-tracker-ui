#!/usr/bin/env node
import "source-map-support/register"
import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"
import {CloudfrontStack} from "../stacks/CloudfrontStack"

const app = new App()

const stackName = app.node.tryGetContext("stackName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")
const staticBucketARn = app.node.tryGetContext("staticBucketARn")
const staticContentBucketKmsKeyArn = app.node.tryGetContext("staticContentBucketKmsKeyArn")

Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("version", version)
Tags.of(app).add("stackName", stackName)
Tags.of(app).add("commit", commit)

new CloudfrontStack(app, "CloudfrontStack", {
  env: {
    region: "us-east-1"
  },
  stackName: `${stackName}-shared-cloudfront`,
  version: version,
  staticBucketArn: staticBucketARn,
  staticContentBucketKmsKeyArn: staticContentBucketKmsKeyArn
})
