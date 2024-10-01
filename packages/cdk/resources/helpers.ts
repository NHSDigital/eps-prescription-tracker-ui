import * as path from "path"
import * as lambda from "aws-cdk-lib/aws-lambda"

const baseDir = path.resolve(__dirname, "../../..")

// eslint-disable-next-line max-len, no-useless-escape
const apiGwLogFormat = '{ \"requestTime\": \"$context.requestTime\", \"apiId\": \"$context.apiId\", \"accountId\": \"$context.accountId\", \"resourcePath\": \"$context.resourcePath\", \"stage\": \"$context.stage\", \"requestId\": \"$context.requestId\", \"extendedRequestId\": \"$context.extendedRequestId\", \"status\": \"$context.status\", \"httpMethod\": \"$context.httpMethod\", \"protocol\": \"$context.protocol\", \"path\": \"$context.path\", \"responseLatency\": \"$context.responseLatency\", \"responseLength\": \"$context.responseLength\", \"domainName\": \"$context.domainName\", \"identity\": { \"sourceIp\": \"$context.identity.sourceIp\", \"userAgent\": \"$context.identity.userAgent\", \"clientCert\":{ \"subjectDN\": \"$context.identity.clientCert.subjectDN\", \"issuerDN\": \"$context.identity.clientCert.issuerDN\", \"serialNumber\": \"$context.identity.clientCert.serialNumber\", \"validityNotBefore\": \"$context.identity.clientCert.validity.notBefore\", \"validityNotAfter\": \"$context.identity.clientCert.validity.notAfter\" }}, \"integration\":{ \"error\": \"$context.integration.error\", \"integrationStatus\": \"$context.integration.integrationStatus\", \"latency\": \"$context.integration.latency\", \"requestId\": \"$context.integration.requestId\", \"status\": \"$context.integration.status\" }}'

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
  apiGwLogFormat,
  getLambdaInvokeURL,
  getDefaultLambdaOptions,
  getLambdaArn
}
