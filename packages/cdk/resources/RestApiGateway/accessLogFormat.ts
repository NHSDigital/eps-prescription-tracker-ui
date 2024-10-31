import {AccessLogFormat} from "aws-cdk-lib/aws-apigateway"

/**
 * API Gateway access log format

 */

export const accessLogFormat = () => {
  return AccessLogFormat.custom(JSON.stringify({
    requestTime: "$context.requestTime",
    apiId: "$context.apiId",
    accountId: "$context.accountId",
    resourcePath: "$context.resourcePath",
    stage: "$context.stage",
    requestId: "$context.requestId",
    extendedRequestId: "$context.extendedRequestId",
    status: "$context.status",
    httpMethod: "$context.httpMethod",
    protocol: "$context.protocol",
    path: "$context.path",
    responseLatency: "$context.responseLatency",
    responseLength: "$context.responseLength",
    domainName: "$context.domainName",
    identity: {
      sourceIp: "$context.identity.sourceIp",
      userAgent: "$context.identity.userAgent",
      clientCert: {
        subjectDN: "$context.identity.clientCert.subjectDN",
        issuerDN: "$context.identity.clientCert.issuerDN",
        serialNumber: "$context.identity.clientCert.serialNumber",
        validityNotBefore: "$context.identity.clientCert.validity.notBefore",
        validityNotAfter: "$context.identity.clientCert.validity.notAfter"
      }
    },
    integration: {
      error: "$context.integration.error",
      integrationStatus: "$context.integration.integrationStatus",
      latency: "$context.integration.latency",
      requestId: "$context.integration.requestId",
      status: "$context.integration.status"
    }
  }))
}
