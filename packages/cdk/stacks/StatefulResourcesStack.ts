import {
  App,
  CfnOutput,
  Stack,
  StackProps
} from "aws-cdk-lib"

import {StaticContentBucket} from "../resources/StaticContentBucket"
import {nagSuppressions} from "../nagSuppressions"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"
import {Cognito} from "../resources/Cognito"

export interface StatefulResourcesStackProps extends StackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
  readonly cloudfrontDomain: string
  readonly cognitoCertificate: Certificate
  readonly cognitoDomain: string
}

/**
 * Clinical Prescription Tracker UI Stateful Resources

 */

export class StatefulResourcesStack extends Stack {
  public constructor(scope: App, id: string, props: StatefulResourcesStackProps){
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const primaryOidcClientId = this.node.tryGetContext("primaryOidcClientId")
    const primaryOidClientSecret = this.node.tryGetContext("primaryOidClientSecret")
    const primaryOidcIssuer = this.node.tryGetContext("primaryOidcIssuer")
    const primaryOidcAuthorizeEndpoint = this.node.tryGetContext("primaryOidcAuthorizeEndpoint")
    const primaryOidcUserInfoEndpoint = this.node.tryGetContext("primaryOidcUserInfoEndpoint")
    const primaryOidcjwksEndpoint = this.node.tryGetContext("primaryOidcjwksEndpoint")

    const mockOidcClientId = this.node.tryGetContext("mockOidcClientId")
    const mockOidClientSecret = this.node.tryGetContext("mockOidClientSecret")
    const mockOidcIssuer = this.node.tryGetContext("mockOidcIssuer")
    const mockOidcAuthorizeEndpoint = this.node.tryGetContext("mockOidcAuthorizeEndpoint")
    const mockOidcUserInfoEndpoint = this.node.tryGetContext("mockOidcUserInfoEndpoint")
    const mockOidcjwksEndpoint = this.node.tryGetContext("mockOidcjwksEndpoint")

    const useMockOidc = this.node.tryGetContext("useMockOidc")

    // Imports

    // Resources
    // - Static Content Bucket
    const staticContentBucket = new StaticContentBucket(this, "StaticContentBucket", {
      bucketName: `${props.serviceName}-staticcontentbucket-${this.account}`})

    /* Resources to add:
      - update policies (me)
      - cognito
      - user state dynamo table
      - JWT secret
      - token lambda
      - API GW for token lambda ??
    */

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cognito = new Cognito(this, "Cognito", {
      primaryOidcClientId: primaryOidcClientId!,
      primaryOidClientSecret: primaryOidClientSecret!,
      primaryOidcIssuer: primaryOidcIssuer!,
      primaryOidcAuthorizeEndpoint: primaryOidcAuthorizeEndpoint!,
      primaryOidcUserInfoEndpoint: primaryOidcUserInfoEndpoint!,
      primaryOidcjwksEndpoint: primaryOidcjwksEndpoint!,
      mockOidcClientId: mockOidcClientId!,
      mockOidClientSecret: mockOidClientSecret!,
      mockOidcIssuer: mockOidcIssuer!,
      mockOidcAuthorizeEndpoint: mockOidcAuthorizeEndpoint!,
      mockOidcUserInfoEndpoint: mockOidcUserInfoEndpoint!,
      mockOidcjwksEndpoint: mockOidcjwksEndpoint!,
      useMockOidc: useMockOidc,
      cognitoDomain: props.cognitoDomain,
      cognitoCertificate: props.cognitoCertificate,
      cloudfrontDomain: props.cloudfrontDomain
    })

    // Outputs

    // Exports
    new CfnOutput(this, "StaticContentBucketArn", {
      value: staticContentBucket.bucket.bucketArn,
      exportName: `${props.stackName}:StaticContentBucket:Arn`
    })
    new CfnOutput(this, "StaticContentBucketName", {
      value: staticContentBucket.bucket.bucketName,
      exportName: `${props.stackName}:StaticContentBucket:Name`
    })

    nagSuppressions(this)
  }
}
