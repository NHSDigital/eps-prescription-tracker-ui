#!/usr/bin/env node
import "source-map-support/register"
import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"
import {CloudfrontStack} from "../stacks/CloudfrontStack"
import {SharedResourcesStack} from "../stacks/SharedResourcesStack"
import {RestApiBase} from "aws-cdk-lib/aws-apigateway"

const app = new App()

const stackName = app.node.tryGetContext("stackName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")
const logRetentionInDays = app.node.tryGetContext("LogRetentionInDays")
const enableSplunk = app.node.tryGetContext("enableSplunk")

Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("version", version)
Tags.of(app).add("stackName", stackName)
Tags.of(app).add("commit", commit)

const SharedResources = new SharedResourcesStack(app, "SharedResourcesStack", {
  env: {
    region: "eu-west-2"
  },
  stackName: `${stackName}-shared-resources`,
  version: version,
  logRetentionInDays: logRetentionInDays,
  enableSplunk: enableSplunk
})

new CloudfrontStack(app, "CloudfrontStack", {
  env: {
    region: "us-east-1"
  },
  crossRegionReferences: true,
  stackName: `${stackName}-shared-cloudfront`,
  version: version,
  contentBucket: SharedResources.contentBucket,
  contentBucketKmsKey: SharedResources.contentBucketKmsKey,
  apiGateway: SharedResources.apiGateway as RestApiBase,
  cognitoUserPoolDomain: SharedResources.cognitoUserPoolDomain,
  cognitoRegion: SharedResources.region
})