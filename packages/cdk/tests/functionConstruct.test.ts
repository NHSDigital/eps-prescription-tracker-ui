import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import * as logs from "aws-cdk-lib/aws-logs"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import {Stack} from "aws-cdk-lib"
import {Template, Match} from "aws-cdk-lib/assertions"
import {LambdaFunction} from "../resources/LambdaFunction"
import {describe, test, beforeAll} from "@jest/globals"

describe("functionConstruct works correctly", () => {
  let stack: Stack
  let app: cdk.App
  let template: cdk.assertions.Template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambdaLogGroupResource: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambdaRoleResource: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambdaResource: any
  // In this case we can use beforeAll() over beforeEach() since our tests
  // do not modify the state of the application
  beforeAll(() => {
    app = new cdk.App()
    stack = new cdk.Stack(app, "lambdaConstructStack")
    const functionConstruct = new LambdaFunction(stack, "dummyFunction", {
      stackName: "testStackName",
      lambdaName: "testLambda",
      additionalPolicies: [
      ],
      logRetentionInDays: 30,
      packageBasePath: "packages/cdk",
      entryPoint: "tests/src/dummyLambda.ts",
      lambdaEnvironmentVariables: {}
    })
    template = Template.fromStack(stack)
    const lambdaLogGroup = functionConstruct.node.tryFindChild("LambdaLogGroup") as logs.LogGroup
    const lambdaRole = functionConstruct.node.tryFindChild("LambdaRole") as iam.Role
    const cfnLambda = functionConstruct.node.tryFindChild("testLambda") as lambda.Function
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
            {"Fn::GetAtt":[lambdaLogGroupResource.Ref, "Arn" ]},
            {"Fn::Join":["", [{"Fn::GetAtt":[lambdaLogGroupResource.Ref, "Arn" ]}, ":log-stream:*"] ]}
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
      "AssumeRolePolicyDocument":{
        "Statement":[
          {
            "Action":"sts:AssumeRole",
            "Effect":"Allow",
            "Principal":{
              "Service":"lambda.amazonaws.com"
            }
          }
        ],
        "Version":"2012-10-17"
      },
      "ManagedPolicyArns":Match.arrayWith([
        {"Fn::ImportValue":"lambda-resources:LambdaInsightsLogGroupPolicy"},
        {"Fn::ImportValue":"account-resources:CloudwatchEncryptionKMSPolicyArn"},
        {"Fn::ImportValue":"account-resources:LambdaDecryptSecretsKMSPolicy"}
      ])
    })
  })

  test("it has the correct lambda", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs20.x",
      FunctionName: "testStackName-testLambda",
      MemorySize: 256,
      Architectures: ["x86_64"],
      Timeout: 50,
      LoggingConfig:{
        "LogGroup":lambdaLogGroupResource
      },
      Layers: [ "arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension:53" ],
      Role:{"Fn::GetAtt":[lambdaRoleResource.Ref, "Arn" ]}
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
          Resource: {"Fn::GetAtt":[lambdaResource.Ref, "Arn" ]}
        }]
      }
    })
  })
})

describe("functionConstruct works correctly with environment variables", () => {
  let stack: Stack
  let app: cdk.App
  let template: cdk.assertions.Template
  beforeAll(() => {
    app = new cdk.App()
    stack = new cdk.Stack(app, "lambdaConstructStack")
    new LambdaFunction(stack, "dummyFunction", {
      stackName: "testStackName",
      lambdaName: "testLambda",
      additionalPolicies: [
      ],
      logRetentionInDays: 30,
      packageBasePath: "packages/cdk",
      entryPoint: "tests/src/dummyLambda.ts",
      lambdaEnvironmentVariables: {foo: "bar"}
    })
    template = Template.fromStack(stack)
  })

  test("environment variables are added correctly", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs20.x",
      FunctionName: "testStackName-testLambda",
      Environment: {"Variables": {foo: "bar"}}
    })
  })

})

describe("functionConstruct works correctly with additional policies", () => {
  let stack: Stack
  let app: cdk.App
  let template: cdk.assertions.Template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testPolicyResource: any
  beforeAll(() => {
    app = new cdk.App()
    stack = new cdk.Stack(app, "lambdaConstructStack")
    const testPolicy = new iam.ManagedPolicy(stack, "testPolicy", {
      description: "test policy",
      statements: [
        new iam.PolicyStatement({
          actions: [
            "logs:CreateLogStream"
          ],
          resources: ["*"]
        })]
    })
    new LambdaFunction(stack, "dummyFunction", {
      stackName: "testStackName",
      lambdaName: "testLambda",
      additionalPolicies: [testPolicy],
      logRetentionInDays: 30,
      packageBasePath: "packages/cdk",
      entryPoint: "tests/src/dummyLambda.ts",
      lambdaEnvironmentVariables: {}
    })
    template = Template.fromStack(stack)
    testPolicyResource = stack.resolve(testPolicy.managedPolicyArn)
  })

  test("it has the correct policies in the role", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      "ManagedPolicyArns":Match.arrayWith([
        {"Fn::ImportValue":"lambda-resources:LambdaInsightsLogGroupPolicy"},
        {"Fn::ImportValue":"account-resources:CloudwatchEncryptionKMSPolicyArn"},
        {"Fn::ImportValue":"account-resources:LambdaDecryptSecretsKMSPolicy"},
        {Ref: testPolicyResource.Ref}
      ])
    })
  })

})
