#!/usr/bin/env node
import "source-map-support/register"
import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"
import {SharedResourcesStack} from "../stacks/SharedResourcesStack"

const app = new App()

const stackName = app.node.tryGetContext("stackName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")
const logRetentionInDays = app.node.tryGetContext("logRetentionInDays")

Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("version", version)
Tags.of(app).add("stackName", stackName)
Tags.of(app).add("commit", commit)

new SharedResourcesStack(app, "SharedResourcesStack", {
  env: {
    region: "eu-west-2"
  },
  crossRegionReferences: true,
  stackName: `${stackName}-shared-resources`,
  version: version,
  logRetentionInDays: logRetentionInDays
})
