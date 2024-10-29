import {Stack, CfnResource} from "aws-cdk-lib"

// function which adds metadata to ignore things which fail cfn-guard
export const addCfnGuardMetadata = (stack: Stack, role: string) => {
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
        guard: {
          SuppressedRules: [
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
        guard: {
          SuppressedRules: [
            "IAM_NO_INLINE_POLICY_CHECK"
          ]
        }
      }
    )
  }
}
