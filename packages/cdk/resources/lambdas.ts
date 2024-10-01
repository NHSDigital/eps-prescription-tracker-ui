import * as cdk from "aws-cdk-lib"

import {LambdaConstruct} from "./lambdaConstruct"
import {Construct} from "constructs"
import {getLambdaArn} from "./helpers"

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
    const status = new LambdaConstruct(this, "StatusResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-status`,
      lambdaArn: getLambdaArn(props.region, props.account, `${props.stackName}-status`),
      additionalPolicies: [
        cdk.Fn.importValue("account-resources:LambdaAccessSecretsPolicy"),
        props.tokenMappingTableReadPolicyArn,
        props.tokenMappingTableWritePolicyArn,
        props.useTokensMappingKMSKeyPolicyArn
      ],
      logRetentionInDays: 30,
      packageBasePath: "packages/statusLambda",
      entryPoint: "src/statusLambda.ts",
      lambdaEnvironmentVariables: {
        "VERSION_NUMBER": props.versionNumber!,
        "COMMIT_ID": props.commitId!,
        TokenMappingTableName: props.tokenMappingTableName!
      }
    })

    // Outputs
    this.statusFunctionName = status.lambdaFunctionName
    this.statusFunctionArn = status.lambdaFunctionArn
    this.executeStatusLambdaPolicyArn = status.executeLambdaPolicyArn
  }
}
