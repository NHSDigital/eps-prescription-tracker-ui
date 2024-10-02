import * as path from "path"
import * as lambda from "aws-cdk-lib/aws-lambda"

const baseDir = path.resolve(__dirname, "../../..")

function getLambdaInvokeURL(region: string, lambdaNArn: string) {
  return `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaNArn}/invocations`
}

function getLambdaArn(region: string, account: string, lambdaName: string) {
  return `arn:aws:lambda:${region}:${account}:function:${lambdaName}`
}
interface defaultLambdaOptionsParams {
    readonly functionName: string;
    readonly packageBasePath: string;
    readonly entryPoint: string;
  }

function getDefaultLambdaOptions(options: defaultLambdaOptionsParams) {
  return {
    functionName: options.functionName,
    runtime: lambda.Runtime.NODEJS_20_X,
    entry: path.join(baseDir, options.packageBasePath, options.entryPoint),
    projectRoot: baseDir,
    memorySize: 1024,
    handler: "handler",
    bundling: {
      minify: true,
      sourceMap: true,
      tsconfig: path.join(baseDir, options.packageBasePath, "tsconfig.json"),
      target: "es2020"
    }
  }
}

export {
  getLambdaInvokeURL,
  getDefaultLambdaOptions,
  getLambdaArn
}
