import {
  App,
  Stack,
  StackProps,
  Fn,
  CfnOutput,
  RemovalPolicy
} from "aws-cdk-lib"
import {IKey, Key} from "aws-cdk-lib/aws-kms"
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
  IBucket,
  BucketAccessControl,
  ObjectOwnership
} from "aws-cdk-lib/aws-s3"
import {
  EndpointType,
  IRestApi,
  LogGroupLogDestination,
  RestApi
} from "aws-cdk-lib/aws-apigateway"
import {IUserPoolDomain} from "aws-cdk-lib/aws-cognito"
import {Role, ServicePrincipal} from "aws-cdk-lib/aws-iam"
import {FilterPattern, LogGroup, SubscriptionFilter} from "aws-cdk-lib/aws-logs"
import {KinesisDestination} from "aws-cdk-lib/aws-logs-destinations"
import {Stream} from "aws-cdk-lib/aws-kinesis"

import {accessLogFormat} from "../resources/RestApiGateway/accessLogFormat"

export interface SharedResourcesStackProperties extends StackProps {
  readonly stackName: string
  readonly version: string
  readonly logRetentionInDays: number
  readonly enableSplunk: boolean
}

export class SharedResourcesStack extends Stack {
  public readonly contentBucket: IBucket
  public contentBucketKmsKey: IKey
  public readonly apiGateway: IRestApi
  public readonly cognitoUserPoolDomain: IUserPoolDomain

  public constructor(scope: App, id: string, props: SharedResourcesStackProperties) {
    super(scope, id, props)

    // Imports
    const auditLoggingBucket = Bucket.fromBucketArn(
      this, "AuditLoggingBucket", Fn.importValue("account-resources:AuditLoggingBucket"))

    const deploymentRole = Role.fromRoleArn(
      this, "deploymentRole", Fn.importValue("ci-resources:CloudFormationDeployRole"))

    const cloudwatchKmsKey = Key.fromKeyArn(
      this, "cloudwatchKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))

    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    // Content S3 Bucket
    const contentBucketKmsKey = new Key(this, "ContentBucketKmsKey", {
      enableKeyRotation: true
    })
    contentBucketKmsKey.addAlias("alias/ContentBucketKmsKey")

    const contentBucket = new Bucket(this, "ContentBucket", {
      encryption: BucketEncryption.KMS,
      bucketKeyEnabled: true,
      encryptionKey: contentBucketKmsKey,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      accessControl: BucketAccessControl.PRIVATE,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      serverAccessLogsBucket: auditLoggingBucket,
      serverAccessLogsPrefix: "/content",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true // forces a deletion even if bucket is not empty
    })

    contentBucket.grantReadWrite(deploymentRole)

    // API Gateway
    const apiGatewayAccessLogGroup = new LogGroup(this, "ApiGatewayAccessLogGroup", {
      logGroupName: `/aws/api/apigateway/${props.stackName}-apigw`,
      retention: props.logRetentionInDays,
      encryptionKey: cloudwatchKmsKey,
      removalPolicy: RemovalPolicy.DESTROY
    })

    if (props.enableSplunk) {
      new SubscriptionFilter(this, "ApiGatewayAccessLogsSplunkSubscriptionFilter", {
        logGroup: apiGatewayAccessLogGroup,
        filterPattern: FilterPattern.allTerms(),
        destination: new KinesisDestination(splunkDeliveryStream, {
          role: splunkSubscriptionFilterRole
        })
      })
    }

    const apiGateway = new RestApi(this, "ApiGateway", {
      restApiName: `${props.stackName}-apigw`,
      endpointConfiguration: {
        types: [EndpointType.REGIONAL]
      },
      deploy: true,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(apiGatewayAccessLogGroup),
        accessLogFormat: accessLogFormat()
      }
    })

    const apiGatewayRole = new Role(this, "ApiGatewayRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
      managedPolicies: []
    })

    // Outputs
    this.contentBucket = contentBucket
    this.contentBucketKmsKey = contentBucketKmsKey
    this.apiGateway = apiGateway
    this.cognitoUserPoolDomain = {} as unknown as IUserPoolDomain // placeholder

    // Exports
    new CfnOutput(this, "ContentBucketArn", {
      value: contentBucket.bucketArn,
      exportName: `${props.stackName}:ContentBucket:Arn`
    })

    new CfnOutput(this, "ApiGatewayId", {
      value: apiGateway.restApiId,
      exportName: `${props.stackName}:ApiGateway:Id`
    })

    new CfnOutput(this, "ApiGatewayRoleArn", {
      value: apiGatewayRole.roleArn,
      exportName: `${props.stackName}:ApiGateway:RoleArn`
    })
  }
}
