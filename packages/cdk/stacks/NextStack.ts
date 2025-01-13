import {App, Stack, StackProps} from "aws-cdk-lib"
import {NextjsGlobalFunctions} from "cdk-nextjs"
import {resolve} from "path"

export class NextStack extends Stack {
  public constructor(scope: App, id: string, props: StackProps) {
    super(scope, id, props)

    new NextjsGlobalFunctions(this, "nextjs", {
      healthCheckPath: "/api/health",
      buildContext: resolve(__dirname, "../../.."),
      relativePathToWorkspace: "./packages/cpt-ui"
    })
  }
}
