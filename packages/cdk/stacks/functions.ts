import * as cdk from "aws-cdk-lib"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as iam from "aws-cdk-lib/aws-iam"

import {LambdaResources} from "./lambdaResources"
import {Construct} from "constructs"
import * as path from "path"

const baseDir = path.resolve(__dirname, "../../..")

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
      additionalPolicies: [
        cdk.Fn.importValue("account-resources:LambdaAccessSecretsPolicy"),
        props.tokenMappingTableReadPolicyArn,
        props.tokenMappingTableWritePolicyArn,
        props.useTokensMappingKMSKeyPolicyArn
      ],
      logRetentionInDays: 30
    })

    const status = new nodeLambda.NodejsFunction(this, "statusLambda", {
      functionName: `${props.stackName!}-status`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(baseDir, "packages/statusLambda/src/statusLambda.ts"),
      role: iam.Role.fromRoleArn(this, "statusResourcesRole", statusResources.lambdaRoleArn),
      projectRoot: baseDir,
      memorySize: 1024,
      handler: "handler",
      bundling: {
        minify: true,
        sourceMap: true,
        tsconfig: path.join(baseDir, "packages/statusLambda/tsconfig.json"),
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
    this.statusFunctionArn = status.functionArn
    this.executeStatusLambdaPolicyArn = statusResources.executeLambdaPolicyArn
  }
}
