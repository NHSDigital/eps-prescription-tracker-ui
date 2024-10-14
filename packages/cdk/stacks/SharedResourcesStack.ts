import {
  App,
  Stack,
  StackProps,
  CfnOutput
} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {RestApi} from "aws-cdk-lib/aws-apigateway"
import {UserPoolDomain} from "aws-cdk-lib/aws-cognito"
import {RestApiGateway} from "../resources/RestApiGateway"
import {StaticContentBucket} from "../resources/StaticContentBucket"

export interface SharedResourcesStackProperties extends StackProps {
  readonly stackName: string
  readonly version: string
  readonly logRetentionInDays: number
  readonly enableSplunk: boolean
}

export class SharedResourcesStack extends Stack {
  public readonly staticContentBucket: Bucket
  public staticContentBucketKmsKey: Key
  public readonly apiGateway: RestApi
  public readonly cognitoUserPoolDomain: UserPoolDomain

  public constructor(scope: App, id: string, props: SharedResourcesStackProperties) {
    super(scope, id, props)

    // S3 Static Content Bucket
    const staticContentBucket = new StaticContentBucket(this, "StaticContentBucket")

    // API Gateway
    const apiGateway = new RestApiGateway(this, "ApiGateway", {
      stackName: props.stackName,
      logRetentionInDays: props.logRetentionInDays,
      enableSplunk: props.enableSplunk
    })

    // Outputs
    this.staticContentBucket = staticContentBucket.bucket
    this.staticContentBucketKmsKey = staticContentBucket.kmsKey
    this.apiGateway = apiGateway.restApiGateway
    this.cognitoUserPoolDomain = {} as unknown as UserPoolDomain // placeholder

    // Exports
    new CfnOutput(this, "StaticContentBucketArn", {
      value: staticContentBucket.bucket.bucketArn,
      exportName: `${props.stackName}:StaticContentBucket:Arn`
    })

    new CfnOutput(this, "ApiGatewayId", {
      value: apiGateway.restApiGateway.restApiId,
      exportName: `${props.stackName}:ApiGateway:Id`
    })

    new CfnOutput(this, "ApiGatewayRoleArn", {
      value: apiGateway.restAPiGatewayRole.roleArn,
      exportName: `${props.stackName}:ApiGateway:RoleArn`
    })
  }
}
