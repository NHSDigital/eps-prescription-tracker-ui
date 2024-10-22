#!/usr/bin/env node
import "source-map-support/register"
import {
  App,
  CfnResource,
  Stack,
  Tags
} from "aws-cdk-lib"
// import {App, Aspects, Tags} from "aws-cdk-lib"
// import {AwsSolutionsChecks} from "cdk-nag"
// import {CloudfrontStack} from "../stacks/CloudfrontStack"
// import {SharedResourcesStack} from "../stacks/SharedResourcesStack"
// import {RestApiBase} from "aws-cdk-lib/aws-apigateway"

import {CloudfrontStackjustUS} from "../stacks/CloudfrontStackjustUS"
import {SharedResourcesStackwCF} from "../stacks/SharedResourcesStackwCF"

const app = new App()

const stackName = app.node.tryGetContext("stackName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")
const logRetentionInDays = Number(app.node.tryGetContext("logRetentionInDays"))
const epsDomainName = app.node.tryGetContext("epsDomainName")
const epsHostedZoneId = app.node.tryGetContext("epsHostedZoneId")

// Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

Tags.of(app).add("version", version)
Tags.of(app).add("stackName", stackName)
Tags.of(app).add("commit", commit)

// const SharedResources = new SharedResourcesStack(app, "SharedResourcesStack", {
//   env: {
//     region: "eu-west-2"
//   },
//   crossRegionReferences: true,
//   stackName: `${stackName}-shared-resources`,
//   version: version,
//   logRetentionInDays: logRetentionInDays
// })

// new CloudfrontStack(app, "CloudfrontStack", {
//   env: {
//     region: "us-east-1"
//   },
//   crossRegionReferences: true,
//   stackName: `${stackName}-shared-cloudfront`,
//   version: version,
//   staticContentBucket: SharedResources.staticContentBucket,
//   staticContentBucketKmsKey: SharedResources.staticContentBucketKmsKey,
//   apiGateway: SharedResources.apiGateway as RestApiBase,
//   cognitoUserPoolDomain: SharedResources.cognitoUserPoolDomain,
//   cognitoRegion: SharedResources.region
// })

const certs = new CloudfrontStackjustUS(app, "Certs", {
  env: {
    region: "us-east-1"
  },
  crossRegionReferences: true,
  stackName: `${stackName}-shared-resources`,
  version: version,
  epsDomainName: epsDomainName,
  epsHostedZoneId: epsHostedZoneId
})

const shared = new SharedResourcesStackwCF(app, "Shared", {
  env: {
    region: "eu-west-2"
  },
  crossRegionReferences: true,
  stackName: `${stackName}-shared-resources`,
  version: version,
  cert: certs.cert,
  logRetentionInDays: logRetentionInDays
})

// run a synth to add cross region lambdas and roles
app.synth()

// add metadata to lambda so they dont get flagged as failing cfn-guard
addCfnGuardMetadata(certs, "Custom::CrossRegionExportWriterCustomResourceProvider")
addCfnGuardMetadata(shared, "Custom::CrossRegionExportReaderCustomResourceProvider")
addCfnGuardMetadata(shared, "Custom::S3AutoDeleteObjectsCustomResourceProvider")

// finally run synth again with force to include the added metadata
app.synth({
  force: true
})

// function which adds metadata to ignore things which fail cfn-guard
function addCfnGuardMetadata(stack: Stack, role: string) {
  const writerProvider = stack.node.tryFindChild(role)
  if (writerProvider === undefined) {
    return
  }
  const writerLambda = writerProvider.node.tryFindChild("Handler") as CfnResource
  const writerRole = writerProvider.node.tryFindChild("Role") as CfnResource
  if (writerLambda !== undefined) {
    writerLambda.cfnOptions.metadata = (
      {
        ...writerLambda.cfnOptions.metadata,
        "guard": {
          "SuppressedRules": [
            "LAMBDA_DLQ_CHECK",
            "LAMBDA_INSIDE_VPC",
            "LAMBDA_CONCURRENCY_CHECK"
          ]
        }
      }
    )
  }
  if (writerRole !== undefined) {
    writerRole.cfnOptions.metadata = (
      {
        ...writerLambda.cfnOptions.metadata,
        "guard": {
          "SuppressedRules": [
            "IAM_NO_INLINE_POLICY_CHECK"
          ]
        }
      }
    )
  }
}
