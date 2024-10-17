#!/usr/bin/env node
import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import {BackendStack} from "../stacks/BackendStack"
import {Aspects, Tags} from "aws-cdk-lib"
import {AwsSolutionsChecks} from "cdk-nag"

const app = new cdk.App()

const stackName = app.node.tryGetContext("stackName")
const version = app.node.tryGetContext("VERSION_NUMBER")
const commit = app.node.tryGetContext("COMMIT_ID")

// add cdk-nag to everything
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}))

// add tags to everything
Tags.of(app).add("version", version)
Tags.of(app).add("stackName", stackName)
Tags.of(app).add("commit", commit)

const Backend = new BackendStack(app, "BackendStack", {
  env: {region: "eu-west-2"},
  stackName: stackName
})

// run a synth to add cross region lambdas and roles
app.synth()

// add metadata to lambda so they dont get flagged as failing cfn-guard
addCfnGuardMetadata(Backend, "Custom::CrossRegionExportReaderCustomResourceProvider")

// finally run synth again with force to include the added metadata
app.synth({
  force: true
})

// function which adds metadata to ignore things which fail cfn-guard
function addCfnGuardMetadata(stack: cdk.Stack, role: string) {
  const writerProvider = stack.node.tryFindChild(role)
  if (writerProvider === undefined) {
    return
  }
  const writerLambda = writerProvider.node.tryFindChild("Handler") as cdk.CfnResource
  const writerRole = writerProvider.node.tryFindChild("Role") as cdk.CfnResource
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
