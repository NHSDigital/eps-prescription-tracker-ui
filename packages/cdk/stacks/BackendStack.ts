import * as cdk from "aws-cdk-lib"
import {ManagedPolicy} from "aws-cdk-lib/aws-iam"

import {LambdaFunction} from "../resources/LambdaFunction"
import {nagSuppressions} from "../resources/nagSuppressions"

/**
 * Clinical Prescription Tracker UI Backend

 */

export class BackendStack extends cdk.Stack {

  public constructor(scope: cdk.App, id: string, props: cdk.StackProps ) {
    super(scope, id, props)

    const lambdaAccessSecretsPolicy = ManagedPolicy.fromManagedPolicyArn(
      this,
      "lambdaAccessSecretsPolicy",
      cdk.Fn.importValue("account-resources:LambdaAccessSecretsPolicy")
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const status = new LambdaFunction(this, "StatusResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-status`,
      additionalPolicies: [
        lambdaAccessSecretsPolicy
      ],
      logRetentionInDays: 30,
      packageBasePath: "packages/statusLambda",
      entryPoint: "src/statusLambda.ts",
      lambdaEnvironmentVariables: {
        "VERSION_NUMBER": "foo",
        "COMMIT_ID": "bar"
      }
    })

    nagSuppressions(this, props.stackName)
  }
}
