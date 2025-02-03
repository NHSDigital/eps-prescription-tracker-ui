export const mockAPIGatewayProxyEvent = {
  httpMethod: "POST",
  body: "",
  headers: {
    Authorization: "Bearer testToken"
  },
  requestContext: {
    requestId: "test-request-id",
    stage: "test"
  },
  pathParameters: {},
  queryStringParameters: {}
}

export const mockContext = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "selectedRoleLambda",
  memoryLimitInMB: "128",
  awsRequestId: "test-request-id",
  invokedFunctionArn: "arn:aws:lambda:test-region:test-account-id:function:test-function-name",
  logGroupName: "/aws/lambda/test-function-name",
  logStreamName: "2025/01/01/[$LATEST]abcdef123456abcdef123456abcdef123456"
}
