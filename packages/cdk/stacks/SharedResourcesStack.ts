import {App, Stack, StackProps} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {RestApi} from "aws-cdk-lib/aws-apigateway"
import {UserPoolDomain} from "aws-cdk-lib/aws-cognito"
import {Dynamodb} from "../resources/dynamodb"
import {Cognito} from "../resources/cognito"
import {nagSuppressions} from "../resources/nagSuppressions"

export interface SharedResourcesStackProperties extends StackProps {
  readonly stackName: string
  readonly version: string
  readonly logRetentionInDays: number
}

/**
 * Clinical Prescription Tracker UI Shared Resources

 */

export class SharedResourcesStack extends Stack {
  public readonly staticContentBucket: Bucket
  public staticContentBucketKmsKey: Key
  public readonly apiGateway: RestApi
  public readonly cognitoUserPoolDomain: UserPoolDomain

  public constructor(scope: App, id: string, props: SharedResourcesStackProperties) {
    super(scope, id, props)
    const primaryOidcClientId = this.node.tryGetContext("primaryOidcClientId")
    const primaryOidClientSecret = this.node.tryGetContext("primaryOidClientSecret")
    const primaryOidcIssuer = this.node.tryGetContext("primaryOidcIssuer")
    const primaryOidcAuthorizeEndpoint = this.node.tryGetContext("primaryOidcAuthorizeEndpoint")
    const primaryOidcTokenEndpoint = this.node.tryGetContext("primaryOidcTokenEndpoint")
    const primaryOidcUserInfoEndpoint = this.node.tryGetContext("primaryOidcUserInfoEndpoint")
    const primaryOidcjwksEndpoint = this.node.tryGetContext("primaryOidcjwksEndpoint")

    const mockOidcClientId = this.node.tryGetContext("mockOidcClientId")
    const mockOidClientSecret = this.node.tryGetContext("mockOidClientSecret")
    const mockOidcIssuer = this.node.tryGetContext("mockOidcIssuer")
    const mockOidcAuthorizeEndpoint = this.node.tryGetContext("mockOidcAuthorizeEndpoint")
    const mockOidcTokenEndpoint = this.node.tryGetContext("mockOidcTokenEndpoint")
    const mockOidcUserInfoEndpoint = this.node.tryGetContext("mockOidcUserInfoEndpoint")
    const mockOidcjwksEndpoint = this.node.tryGetContext("mockOidcjwksEndpoint")

    const useMockOidc = this.node.tryGetContext("useMockOidc")

    const tables = new Dynamodb(this, "Tables", {
      stackName: this.stackName,
      account: this.account,
      region: this.region
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cognito = new Cognito(this, "Cognito", {
      stackName: this.stackName,
      primaryOidcClientId: primaryOidcClientId!,
      primaryOidClientSecret: primaryOidClientSecret!,
      primaryOidcIssuer: primaryOidcIssuer!,
      primaryOidcAuthorizeEndpoint: primaryOidcAuthorizeEndpoint!,
      primaryOidcTokenEndpoint: primaryOidcTokenEndpoint!,
      primaryOidcUserInfoEndpoint: primaryOidcUserInfoEndpoint!,
      primaryOidcjwksEndpoint: primaryOidcjwksEndpoint!,
      mockOidcClientId: mockOidcClientId!,
      mockOidClientSecret: mockOidClientSecret!,
      mockOidcIssuer: mockOidcIssuer!,
      mockOidcAuthorizeEndpoint: mockOidcAuthorizeEndpoint!,
      mockOidcTokenEndpoint: mockOidcTokenEndpoint!,
      mockOidcUserInfoEndpoint: mockOidcUserInfoEndpoint!,
      mockOidcjwksEndpoint: mockOidcjwksEndpoint!,
      useMockOidc: useMockOidc,
      tokenMappingTable: tables.tokenMappingTable,
      //userPoolTlsCertificateArn: props.userPoolTLSCertificateArn,
      region: this.region,
      account: this.account,
      tokenMappingTableWritePolicy: tables.tokenMappingTableWritePolicy,
      tokenMappingTableReadPolicy: tables.tokenMappingTableReadPolicy,
      useTokensMappingKMSKeyPolicy: tables.useTokensMappingKmsKeyPolicy
    })
    nagSuppressions(this, props.stackName)

    // Outputs

    // Exports

  }
}
