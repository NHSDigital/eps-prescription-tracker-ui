import * as cdk from "aws-cdk-lib"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as path from "path"

import {LambdaResources} from "./lambdaResources"
import {Construct} from "constructs"

export interface FunctionsStackProps {
  /**
   * @default 'none'
   */
  readonly stackName?: string;
  /**
   */
  readonly versionNumber: string;
  /**
   */
  readonly commitId: string;
  /**
   */
  readonly tokenMappingTableName: string;
  readonly region: string;
  readonly account: string;
  readonly tokenMappingTableWritePolicyArn: string;
  readonly tokenMappingTableReadPolicyArn: string;
  readonly useTokensMappingKMSKeyPolicyArn: string
}

/**
 * PFP lambda functions and related resources

 */
export class Functions extends Construct {
  /**
   * The function name of the Status lambda
   */
  public readonly statusFunctionName
  /**
   * The function ARN of the Status lambda
   */
  public readonly statusFunctionArn
  public readonly executeStatusLambdaPolicyArn

  public constructor(scope: Construct, id: string, props: FunctionsStackProps) {
    super(scope, id)

    // Applying default props
    props = {
      ...props,
      stackName: props.stackName ?? "none",
      region: props.region,
      account: props.account
    }

    // Resources
    const statusResources = new LambdaResources(this, "StatusResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-status`,
      lambdaArn: `arn:aws:lambda:${props.region}:${props.account}:function:${props.stackName!}-status`,
      includeAdditionalPolicies: true,
      additionalPolicies: [
        cdk.Fn.importValue("account-resources:LambdaAccessSecretsPolicy"),
        props.tokenMappingTableReadPolicyArn,
        props.tokenMappingTableWritePolicyArn,
        props.useTokensMappingKMSKeyPolicyArn
      ],
      logRetentionInDays: 30
    })

    const status = new nodeLambda.NodejsFunction(this, "statusLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../statusLambda/src/statusLambda.ts"),
      projectRoot: path.join(__dirname, "../"),
      memorySize: 1024,
      handler: "statusLambda.handler",
      bundling: {
        minify: true,
        sourceMap: true,
        tsconfig: "../statusLambda/tsconfig.json",
        target: "es2020"
      },
      environment: {
        "VERSION_NUMBER": props.versionNumber!,
        "COMMIT_ID": props.commitId!,
        TokenMappingTableName: props.tokenMappingTableName!
      }
    })

    // Outputs
    this.statusFunctionName = status.functionName
    new cdk.CfnOutput(this, "CfnOutputStatusFunctionName", {
      key: "StatusFunctionName",
      description: "The function name of the Status lambda",
      value: this.statusFunctionName!.toString()
    })
    this.statusFunctionArn = status.functionArn
    new cdk.CfnOutput(this, "CfnOutputStatusFunctionArn", {
      key: "StatusFunctionArn",
      description: "The function ARN of the Status lambda",
      value: this.statusFunctionArn!.toString()
    })
    this.executeStatusLambdaPolicyArn = statusResources.executeLambdaPolicyArn
  }
}
