import {Duration} from "aws-cdk-lib"
import {Architecture, Runtime} from "aws-cdk-lib/aws-lambda"
import {NodejsFunctionProps} from "aws-cdk-lib/aws-lambda-nodejs"
import {join, resolve} from "path"

const baseDir = resolve(__dirname, "../../..")

function getLambdaInvokeURL(region: string, lambdaNArn: string) {
  return `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaNArn}/invocations`
}

function getLambdaArn(region: string, account: string, lambdaName: string) {
  return `arn:aws:lambda:${region}:${account}:function:${lambdaName}`
}
interface DefaultLambdaOptionsParams {
    readonly functionName: string;
    readonly packageBasePath: string;
    readonly entryPoint: string;
  }

function getDefaultLambdaOptions(options: DefaultLambdaOptionsParams): NodejsFunctionProps {
  const defaultOptions: NodejsFunctionProps = {
    functionName: options.functionName,
    runtime: Runtime.NODEJS_20_X,
    entry: join(baseDir, options.packageBasePath, options.entryPoint),
    projectRoot: baseDir,
    memorySize: 256,
    timeout: Duration.seconds(50),
    architecture: Architecture.X86_64,
    handler: "handler",
    bundling: {
      minify: true,
      sourceMap: true,
      tsconfig: join(baseDir, options.packageBasePath, "tsconfig.json"),
      target: "es2020"
    }
  }
  return defaultOptions
}

export {
  getLambdaInvokeURL,
  getDefaultLambdaOptions,
  getLambdaArn
}
