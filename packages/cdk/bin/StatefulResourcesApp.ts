import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"

import {addCfnGuardMetadata} from "./utils/appUtils"
import {UsCertsStack} from "../stacks/UsCertsStack"
import {StatefulResourcesStack} from "../stacks/StatefulResourcesStack"

const app = new App()
/* Required Context:
  - serviceName
  - version
  - commit
  - allowAutoDeleteObjects
  - cloudfrontDistributionId
  - epsDomainName
  - epsHostedZoneId
*/
const serviceName = app.node.tryGetContext("serviceName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")

// add cdk-nag to everything
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("serviceName", serviceName)
Tags.of(app).add("version", version)
Tags.of(app).add("commit", commit)
Tags.of(app).add("cdkApp", "StatefulApp")

// define the host names we are going to use for everything
const shortCloudfrontDomain = serviceName
const parentCognitoDomain = `auth.${serviceName}`
// shortCognitoDomain must be a subdomain of parentCognitoDomain
const shortCognitoDomain = `login.${parentCognitoDomain}`

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
