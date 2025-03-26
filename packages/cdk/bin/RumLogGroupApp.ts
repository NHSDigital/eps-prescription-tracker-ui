import {App, Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"

import {RumLogGroupStack} from "../stacks/RumLogGroupStack"

const app = new App()
/*Required Context:
  - serviceName
  - version
  - commit
  - logRetentionInDays
  - logLevel
  - epsDomainName
  - epsHostedZoneId
  - cloudfrontCertArn */

const serviceName = app.node.tryGetContext("serviceName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")

// add cdk-nag to everything
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("serviceName", serviceName)
Tags.of(app).add("version", version)
Tags.of(app).add("commit", commit)
Tags.of(app).add("cdkApp", "RumLogGroupApp")

new RumLogGroupStack(app, "RumLogGroupApp", {
  env: {
    region: "eu-west-2"
  },
  serviceName: serviceName,
  stackName: `${serviceName}-rum-log-group`,
  version: version
})
