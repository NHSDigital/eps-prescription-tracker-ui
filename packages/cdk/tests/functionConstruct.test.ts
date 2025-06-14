import {App, assertions, Stack} from "aws-cdk-lib"
import {ManagedPolicy, PolicyStatement, Role} from "aws-cdk-lib/aws-iam"
import {LogGroup} from "aws-cdk-lib/aws-logs"
import {Function} from "aws-cdk-lib/aws-lambda"
import {Template, Match} from "aws-cdk-lib/assertions"
import {describe, test, beforeAll} from "@jest/globals"

import {LambdaFunction} from "../resources/LambdaFunction"

describe("functionConstruct works correctly", () => {
  let stack: Stack
  let app: App
  let template: assertions.Template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambdaLogGroupResource: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambdaRoleResource: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambdaResource: any
  // In this case we can use beforeAll() over beforeEach() since our tests
  // do not modify the state of the application
  beforeAll(() => {
    app = new App()
    stack = new Stack(app, "lambdaConstructStack")
    const functionConstruct = new LambdaFunction(stack, "dummyFunction", {
      serviceName: "testServiceName",
      stackName: "testServiceName-testStack",
      lambdaName: "testLambda",
      additionalPolicies: [
      ],
      packageBasePath: "packages/cdk",
      entryPoint: "tests/src/dummyLambda.ts",
      lambdaEnvironmentVariables: {},
      logRetentionInDays: 30,
      logLevel: "DEBUG"
    })
    template = Template.fromStack(stack)
    const lambdaLogGroup = functionConstruct.node.tryFindChild("LambdaLogGroup") as LogGroup
    const lambdaRole = functionConstruct.node.tryFindChild("LambdaRole") as Role
    const cfnLambda = functionConstruct.node.tryFindChild("testLambda") as Function
    lambdaRoleResource = stack.resolve(lambdaRole.roleName)
    lambdaLogGroupResource = stack.resolve(lambdaLogGroup.logGroupName)
    lambdaResource = stack.resolve(cfnLambda.functionName)
  })

  test("We have found log group, role and lambda", () => {
    expect(lambdaRoleResource).not.toBe(undefined)
    expect(lambdaLogGroupResource).not.toBe(undefined)
    expect(lambdaResource).not.toBe(undefined)
  })

  test("it has the correct log group", () => {
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      LogGroupName: "/aws/lambda/testLambda",
      KmsKeyId: {"Fn::ImportValue": "account-resources:CloudwatchLogsKmsKeyArn"},
      RetentionInDays: 30
    })
  })

  test("it has the correct policy for writing logs", () => {
    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      Description: "write to testLambda logs",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [{
          Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
          Effect: "Allow",
          Resource: [
            {"Fn::GetAtt": [lambdaLogGroupResource.Ref, "Arn"]},
            {"Fn::Join": ["", [{"Fn::GetAtt": [lambdaLogGroupResource.Ref, "Arn"]}, ":log-stream:*"]]}
          ]
        }]
      }
    })
  })

  test("it has the correct subscription filter", () => {
    template.hasResourceProperties("AWS::Logs::SubscriptionFilter", {
      LogGroupName: {"Ref": lambdaLogGroupResource.Ref},
      FilterPattern: "",
      RoleArn: {"Fn::ImportValue": "lambda-resources:SplunkSubscriptionFilterRole"},
      DestinationArn: {"Fn::ImportValue": "lambda-resources:SplunkDeliveryStream"}
    })
  })

  test("it has the correct role", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      "AssumeRolePolicyDocument": {
        "Statement": [
          {
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": {
              "Service": "lambda.amazonaws.com"
            }
          }
        ],
        "Version": "2012-10-17"
      },
      "ManagedPolicyArns": Match.arrayWith([
        {"Fn::ImportValue": "lambda-resources:LambdaInsightsLogGroupPolicy"},
        {"Fn::ImportValue": "account-resources:CloudwatchEncryptionKMSPolicyArn"},
        {"Fn::ImportValue": "account-resources:LambdaDecryptSecretsKMSPolicy"}
      ])
    })
  })

  test("it has the correct lambda", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs22.x",
      FunctionName: "testServiceName-testLambda",
      MemorySize: 256,
      Architectures: ["x86_64"],
      Timeout: 50,
      LoggingConfig: {
        "LogGroup": lambdaLogGroupResource
      },
      Layers: ["arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension:53"],
      Role: {"Fn::GetAtt": [lambdaRoleResource.Ref, "Arn"]}
    })
  })

  test("it has the correct policy for executing the lambda", () => {
    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      Description: "execute lambda testLambda",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [{
          Action: "lambda:InvokeFunction",
          Effect: "Allow",
          Resource: {"Fn::GetAtt": [lambdaResource.Ref, "Arn"]}
        }]
      }
    })
  })
})

describe("functionConstruct works correctly with environment variables", () => {
  let stack: Stack
  let app: App
  let template: assertions.Template
  beforeAll(() => {
    app = new App()
    stack = new Stack(app, "lambdaConstructStack")
    new LambdaFunction(stack, "dummyFunction", {
      serviceName: "testServiceName",
      stackName: "testServiceName-testStack",
      lambdaName: "testLambda",
      additionalPolicies: [],
      packageBasePath: "packages/cdk",
      entryPoint: "tests/src/dummyLambda.ts",
      lambdaEnvironmentVariables: {foo: "bar"},
      logRetentionInDays: 30,
      logLevel: "DEBUG"
    })
    template = Template.fromStack(stack)
  })

  test("environment variables are added correctly", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      FunctionName: "testServiceName-testLambda",
      Environment: {Variables: {foo: "bar"}}
    })
  })
})

describe("functionConstruct works correctly with additional policies", () => {
  let stack: Stack
  let app: App
  let template: assertions.Template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testPolicyResource: any
  beforeAll(() => {
    app = new App()
    stack = new Stack(app, "lambdaConstructStack")
    const testPolicy = new ManagedPolicy(stack, "testPolicy", {
      description: "test policy",
      statements: [
        new PolicyStatement({
          actions: [
            "logs:CreateLogStream"
          ],
          resources: ["*"]
        })]
    })
    new LambdaFunction(stack, "dummyFunction", {
      serviceName: "testServiceName",
      stackName: "testServiceName-testStack",
      lambdaName: "testLambda",
      additionalPolicies: [testPolicy],
      packageBasePath: "packages/cdk",
      entryPoint: "tests/src/dummyLambda.ts",
      lambdaEnvironmentVariables: {},
      logRetentionInDays: 30,
      logLevel: "DEBUG"
    })
    template = Template.fromStack(stack)
    testPolicyResource = stack.resolve(testPolicy.managedPolicyArn)
  })

  test("it has the correct policies in the role", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      "ManagedPolicyArns": Match.arrayWith([
        {"Fn::ImportValue": "lambda-resources:LambdaInsightsLogGroupPolicy"},
        {"Fn::ImportValue": "account-resources:CloudwatchEncryptionKMSPolicyArn"},
        {"Fn::ImportValue": "account-resources:LambdaDecryptSecretsKMSPolicy"},
        {Ref: testPolicyResource.Ref}
      ])
    })
  })
})
