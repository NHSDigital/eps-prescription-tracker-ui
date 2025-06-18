import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"

import {addCfnGuardMetadata} from "./utils/appUtils"
import {UsCertsStack} from "../stacks/UsCertsStack"
import {StatefulResourcesStack} from "../stacks/StatefulResourcesStack"
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
const useCustomCognitoDomain = app.node.tryGetContext("useCustomCognitoDomain")
const useZoneApex: boolean = app.node.tryGetContext("useZoneApex")

// add cdk-nag to everything
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("serviceName", serviceName)
Tags.of(app).add("version", version)
Tags.of(app).add("commit", commit)
Tags.of(app).add("cdkApp", "StatefulApp")

// define the host names we are going to use for everything
let shortCloudfrontDomain
let parentCognitoDomain
if (useZoneApex) {
  shortCloudfrontDomain = "APEX_DOMAIN" // we need to set this to something for an export to work
  parentCognitoDomain = "auth"
} else {
  shortCloudfrontDomain = serviceName
  parentCognitoDomain = `auth.${serviceName}`
}

// shortCognitoDomain must be a subdomain of parentCognitoDomain
let shortCognitoDomain
if (useCustomCognitoDomain) {
  shortCognitoDomain = `login.${parentCognitoDomain}`
} else {
  shortCognitoDomain = serviceName
}

const UsCerts = new UsCertsStack(app, "UsCertsStack", {
  env: {
    region: "us-east-1"
  },
  serviceName: serviceName,
  crossRegionReferences: true,
  stackName: `${serviceName}-us-certs`,
  version: version,
  shortCloudfrontDomain: shortCloudfrontDomain,
  shortCognitoDomain: shortCognitoDomain,
  parentCognitoDomain: parentCognitoDomain
})

const StatefulResources = new StatefulResourcesStack(app, "StatefulStack", {
  env: {
    region: "eu-west-2"
  },
  serviceName: serviceName,
  stackName: `${serviceName}-stateful-resources`,
  version: version,
  shortCloudfrontDomain: shortCloudfrontDomain,
  fullCloudfrontDomain: UsCerts.fullCloudfrontDomain,
  cognitoCertificate: UsCerts.cognitoCertificate,
  shortCognitoDomain: shortCognitoDomain,
  fullCognitoDomain: UsCerts.fullCognitoDomain,
  crossRegionReferences: true
})

// run a synth to add cross region lambdas and roles
app.synth()

// add metadata to lambda so they don't get flagged as failing cfn-guard
addCfnGuardMetadata(UsCerts, "Custom::CrossRegionExportWriterCustomResourceProvider", "Handler")
addCfnGuardMetadata(StatefulResources, "Custom::S3AutoDeleteObjectsCustomResourceProvider", "Handler")
addCfnGuardMetadata(StatefulResources, "Custom::CrossRegionExportReaderCustomResourceProvider", "Handler")
addCfnGuardMetadata(StatefulResources, "AWS679f53fac002430cb0da5b7982bd2287", "Resource")

// finally run synth again with force to include the added metadata
app.synth({
  force: true
})
