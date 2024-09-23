import * as cdk from "aws-cdk-lib"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import * as iam from "aws-cdk-lib/aws-iam"
import {aws_lambda as lambda} from "aws-cdk-lib"

import {LambdaResources} from "./lambdaResources"
import {Construct} from "constructs"
import {getDefaultLambdaOptions, getLambdaArn} from "./helpers"

export interface FunctionsStackProps {
  /**
   * @default 'none'
   */
  readonly stackName: string;
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
      stackName: props.stackName,
      region: props.region,
      account: props.account
    }

    // Resources
    const statusResources = new LambdaResources(this, "StatusResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-status`,
      lambdaArn: getLambdaArn(props.region, props.account, `${props.stackName}-status`),
      additionalPolicies: [
        cdk.Fn.importValue("account-resources:LambdaAccessSecretsPolicy"),
        props.tokenMappingTableReadPolicyArn,
        props.tokenMappingTableWritePolicyArn,
        props.useTokensMappingKMSKeyPolicyArn
      ],
      logRetentionInDays: 30
    })

    const statusOptions = getDefaultLambdaOptions({
      functionName: `${props.stackName!}-status`,
      packageBasePath: "packages/statusLambda",
      entryPoint: "src/statusLambda.ts"
    })
    const status = new nodeLambda.NodejsFunction(this, "statusLambda", {
      ...statusOptions,
      role: iam.Role.fromRoleArn(this, "statusResourcesRole", statusResources.lambdaRoleArn),
      environment: {
        "VERSION_NUMBER": props.versionNumber!,
        "COMMIT_ID": props.commitId!,
        TokenMappingTableName: props.tokenMappingTableName!
      }
    })

    const cfnStatus = status.node.defaultChild as lambda.CfnFunction
    cfnStatus.cfnOptions.metadata = {
      "guard": {
        "SuppressedRules": [
          "LAMBDA_DLQ_CHECK",
          "LAMBDA_INSIDE_VPC",
          "LAMBDA_CONCURRENCY_CHECK"
        ]
      }
    }

    // Outputs
    this.statusFunctionName = status.functionName
    this.statusFunctionArn = status.functionArn
    this.executeStatusLambdaPolicyArn = statusResources.executeLambdaPolicyArn
  }
}
