#!/usr/bin/env node
import "source-map-support/register"
import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"
import {CloudfrontStack} from "../stacks/CloudfrontStack"
import {SharedResourcesStack} from "../stacks/SharedResourcesStack"

const app = new App()

const stackName = app.node.tryGetContext("stackName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")
const domainName = app.node.tryGetContext("epsDomain")
const hostedZoneId = app.node.tryGetContext("epsZoneId")

Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("version", version)
Tags.of(app).add("stackName", stackName)
Tags.of(app).add("commit", commit)

const SharedResources = new SharedResourcesStack(app, "SharedResourcesStack", {
  env: {
    region: "eu-west-2"
  },
  stackName: stackName,
  version: version
})

new CloudfrontStack(app, "CloudfrontStack", {
  env: {
    region: "us-east-1"
  },
  stackName: stackName,
  version: version,
  domainName: domainName,
  hostedZoneId: hostedZoneId,
  contentBucket: SharedResources.contentBucket
})
