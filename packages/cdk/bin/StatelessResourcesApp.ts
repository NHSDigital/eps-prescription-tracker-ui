import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"

import {addCfnGuardMetadata} from "./utils/appUtils"
import {StatelessResourcesStack} from "../stacks/StatelessResourcesStack"

const app = new App()
/*Required Context:
  - serviceName
  - version
  - commit
  - logRetentionInDays
  - epsDomainName
  - epsHostedZoneId
  - cloudfrontCertArn */

const serviceName = app.node.tryGetContext("serviceName")
const version = app.node.tryGetContext("version")
const commit = app.node.tryGetContext("COMMIT_ID")

// add cdk-nag to everything
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("serviceName", serviceName)
Tags.of(app).add("version", version)
Tags.of(app).add("commit", commit)
Tags.of(app).add("cdkApp", "StatelessApp")

const StatelessResources = new StatelessResourcesStack(app, "StatelessStack", {
  env: {
    region: "eu-west-2"
  },
  crossRegionReferences: true,
  serviceName: serviceName,
  stackName: "stateless-resources",
  version: version
})

// run a synth to add cross region lambdas and roles
app.synth()

// add metadata to lambda so they don't get flagged as failing cfn-guard
addCfnGuardMetadata(StatelessResources, "Custom::CrossRegionExportWriterCustomResourceProvider")

// finally run synth again with force to include the added metadata
app.synth({
  force: true
})
