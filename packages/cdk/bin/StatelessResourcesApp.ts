import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"

import {StatelessResourcesStack} from "../stacks/StatelessResourcesStack"
import fs from "fs"

// read the config in
const configFileName = process.env["CONFIG_FILE_NAME"]
if (configFileName === undefined) {
  throw new Error("Can not read config file")
}

const configDetails = JSON.parse(fs.readFileSync(configFileName, "utf-8"))

// create the app using the config details
const app = new App({context: configDetails})

const serviceName = app.node.tryGetContext("serviceName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")
const cfnDriftDetectionGroup = app.node.tryGetContext("cfnDriftDetectionGroup")

// add cdk-nag to everything
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("serviceName", serviceName, {excludeResourceTypes: ["AWS::CloudFront::KeyValueStore"]})
Tags.of(app).add("version", version, {excludeResourceTypes: ["AWS::CloudFront::KeyValueStore"]})
Tags.of(app).add("commit", commit, {excludeResourceTypes: ["AWS::CloudFront::KeyValueStore"]})
Tags.of(app).add("cdkApp", "StatelessApp", {excludeResourceTypes: ["AWS::CloudFront::KeyValueStore"]})
Tags.of(app).add("repo", "eps-prescription-tracker-ui", {excludeResourceTypes: ["AWS::CloudFront::KeyValueStore"]})
Tags.of(app).add("cfnDriftDetectionGroup", cfnDriftDetectionGroup, {
  excludeResourceTypes: ["AWS::CloudFront::KeyValueStore"]})

new StatelessResourcesStack(app, "StatelessStack", {
  env: {
    region: "eu-west-2"
  },
  serviceName: serviceName,
  stackName: `${serviceName}-stateless-resources`,
  version: version,
  commit: commit
})
