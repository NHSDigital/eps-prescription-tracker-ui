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
const version = app.node.tryGetContext("version")
const commit = app.node.tryGetContext("COMMIT_ID")

// add cdk-nag to everything
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("serviceName", serviceName)
Tags.of(app).add("version", version)
Tags.of(app).add("commit", commit)
Tags.of(app).add("cdkApp", "StatefulApp")

const UsCerts = new UsCertsStack(app, "UsCertsStack", {
  env: {
    region: "us-east-1"
  },
  crossRegionReferences: true,
  serviceName: serviceName,
  stackName: "us-certs",
  version: version
})

const StatefulResources = new StatefulResourcesStack(app, "StatefulStack", {
  env: {
    region: "eu-west-2"
  },
  crossRegionReferences: true,
  serviceName: serviceName,
  stackName: "stateful-resources",
  version: version
})

// run a synth to add cross region lambdas and roles
app.synth()

// add metadata to lambda so they don't get flagged as failing cfn-guard
addCfnGuardMetadata(UsCerts, "Custom::CrossRegionExportWriterCustomResourceProvider")
addCfnGuardMetadata(StatefulResources, "Custom::CrossRegionExportReaderCustomResourceProvider")
addCfnGuardMetadata(StatefulResources, "Custom::S3AutoDeleteObjectsCustomResourceProvider")

// finally run synth again with force to include the added metadata
app.synth({
  force: true
})
