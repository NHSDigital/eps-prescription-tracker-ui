import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import {Construct} from "constructs"

import {FunctionConstruct} from "./functionConstruct"

export interface FunctionsStackProps {
  readonly stackName: string;
  readonly versionNumber: string;
  readonly commitId: string;
  readonly tokenMappingTable: dynamodb.TableV2;
  readonly tokenMappingTableWritePolicy: iam.IManagedPolicy;
  readonly tokenMappingTableReadPolicy: iam.IManagedPolicy;
  readonly useTokensMappingKMSKeyPolicy: iam.IManagedPolicy
}
export class Functions extends Construct {
  public readonly statusLambda: lambda.Function
  public readonly executeStatusLambdaPolicy: iam.ManagedPolicy

  public constructor(scope: Construct, id: string, props: FunctionsStackProps) {
    super(scope, id)

    // Resources
    const lambdaAccessSecretsPolicy = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      "lambdaAccessSecretsPolicy",
      cdk.Fn.importValue("account-resources:LambdaAccessSecretsPolicy")
    )

    const status = new FunctionConstruct(this, "StatusResources", {
      stackName: props.stackName!,
      lambdaName: `${props.stackName!}-status`,
      additionalPolicies: [
        lambdaAccessSecretsPolicy,
        props.tokenMappingTableReadPolicy,
        props.tokenMappingTableWritePolicy,
        props.useTokensMappingKMSKeyPolicy
      ],
      logRetentionInDays: 30,
      packageBasePath: "packages/statusLambda",
      entryPoint: "src/statusLambda.ts",
      lambdaEnvironmentVariables: {
        "VERSION_NUMBER": props.versionNumber!,
        "COMMIT_ID": props.commitId!,
        TokenMappingTableName: props.tokenMappingTable.tableName
      }
    })

    // Outputs
    this.statusLambda = status.lambda
    this.executeStatusLambdaPolicy = status.executeLambdaManagedPolicy
  }
}
