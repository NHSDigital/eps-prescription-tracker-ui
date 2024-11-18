import {
  App,
  CfnOutput,
  Fn,
  Stack,
  StackProps
} from "aws-cdk-lib"

import {StaticContentBucket} from "../resources/StaticContentBucket"
import {nagSuppressions} from "../nagSuppressions"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"
import {Cognito} from "../resources/Cognito"
import {Dynamodb} from "../resources/Dynamodb"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {Role} from "aws-cdk-lib/aws-iam"
import {HostedZone} from "aws-cdk-lib/aws-route53"

export interface StatefulResourcesStackProps extends StackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
  readonly shortCloudfrontDomain: string
  readonly fullCloudfrontDomain: string
  readonly cognitoCertificate: Certificate
  readonly shortCognitoDomain: string
  readonly fullCognitoDomain: string
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
    const primaryTokenEndpoint = this.node.tryGetContext("primaryTokenEndpoint")

    const mockOidcClientId = this.node.tryGetContext("mockOidcClientId")
    const mockOidClientSecret = this.node.tryGetContext("mockOidClientSecret")
    const mockOidcIssuer = this.node.tryGetContext("mockOidcIssuer")
    const mockOidcAuthorizeEndpoint = this.node.tryGetContext("mockOidcAuthorizeEndpoint")
    const mockOidcUserInfoEndpoint = this.node.tryGetContext("mockOidcUserInfoEndpoint")
    const mockOidcjwksEndpoint = this.node.tryGetContext("mockOidcjwksEndpoint")
    const mockTokenEndpoint = this.node.tryGetContext("mockTokenEndpoint")

    const useMockOidc = this.node.tryGetContext("useMockOidc")

    const epsDomainName: string = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId: string = this.node.tryGetContext("epsHostedZoneId")

    const allowAutoDeleteObjects: boolean = this.node.tryGetContext("allowAutoDeleteObjects") === "true"
    const cloudfrontDistributionId: string = this.node.tryGetContext("cloudfrontDistributionId")

    const useLocalhostCallback = this.node.tryGetContext("useLocalhostCallback")

    // Imports
    const auditLoggingBucketImport = Fn.importValue("account-resources:AuditLoggingBucket")
    const deploymentRoleImport = Fn.importValue("ci-resources:CloudFormationDeployRole")

    // Coerce context and imports to relevant types
    const auditLoggingBucket = Bucket.fromBucketArn(
      this, "AuditLoggingBucket", auditLoggingBucketImport)
    const deploymentRole = Role.fromRoleArn(this, "deploymentRole", deploymentRoleImport)
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    // Resources
    // - Static Content Bucket
    const staticContentBucket = new StaticContentBucket(this, "StaticContentBucket", {
      bucketName: `${props.serviceName}-staticcontentbucket-${this.account}`,
      allowAutoDeleteObjects: allowAutoDeleteObjects,
      cloudfrontDistributionId: cloudfrontDistributionId,
      auditLoggingBucket: auditLoggingBucket,
      deploymentRole: deploymentRole
    })

    // - Cognito resources
    const cognito = new Cognito(this, "Cognito", {
      primaryOidcClientId: primaryOidcClientId!,
      primaryOidClientSecret: primaryOidClientSecret,
      primaryOidcIssuer: primaryOidcIssuer,
      primaryOidcAuthorizeEndpoint: primaryOidcAuthorizeEndpoint,
      primaryOidcUserInfoEndpoint: primaryOidcUserInfoEndpoint,
      primaryOidcjwksEndpoint: primaryOidcjwksEndpoint,
      primaryTokenEndpoint: primaryTokenEndpoint,
      mockOidcClientId: mockOidcClientId,
      mockOidClientSecret: mockOidClientSecret,
      mockOidcIssuer: mockOidcIssuer,
      mockOidcAuthorizeEndpoint: mockOidcAuthorizeEndpoint,
      mockOidcUserInfoEndpoint: mockOidcUserInfoEndpoint,
      mockOidcjwksEndpoint: mockOidcjwksEndpoint,
      mockTokenEndpoint: mockTokenEndpoint,
      useMockOidc: useMockOidc,
      shortCognitoDomain: props.shortCognitoDomain,
      fullCognitoDomain: props.fullCognitoDomain,
      fullCloudfrontDomain: props.fullCloudfrontDomain,
      cognitoCertificate: props.cognitoCertificate,
      hostedZone: hostedZone,
      useLocalhostCallback: useLocalhostCallback
    })

    // - Dynamodb table for user state
    const dynamodb = new Dynamodb(this, "DynamoDB", {
      stackName: props.stackName,
      account: this.account,
      region: this.region
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
    new CfnOutput(this, "tokenMappingTableArn", {
      value: dynamodb.tokenMappingTable.tableArn,
      exportName: `${props.stackName}:tokenMappingTable:Arn`
    })
    new CfnOutput(this, "tokenMappingTableReadPolicyArn", {
      value: dynamodb.tokenMappingTableReadPolicy.managedPolicyArn,
      exportName: `${props.stackName}:tokenMappingTableReadPolicy:Arn`
    })
    new CfnOutput(this, "tokenMappingTableWritePolicyArn", {
      value: dynamodb.tokenMappingTableWritePolicy.managedPolicyArn,
      exportName: `${props.stackName}:tokenMappingTableWritePolicy:Arn`
    })
    new CfnOutput(this, "useTokensMappingKmsKeyPolicyArn", {
      value: dynamodb.useTokensMappingKmsKeyPolicy.managedPolicyArn,
      exportName: `${props.stackName}:useTokensMappingKmsKeyPolicy:Arn`
    })
    new CfnOutput(this, "primaryPoolIdentityProviderName", {
      value: cognito.primaryPoolIdentityProvider.providerName,
      exportName: `${props.stackName}:primaryPoolIdentityProvider:Name`
    })
    if (useMockOidc) {
      new CfnOutput(this, "mockPoolIdentityProvider", {
        value: cognito.mockPoolIdentityProvider.providerName,
        exportName: `${props.stackName}:mockPoolIdentityProvider:Name`
      })
    }
    new CfnOutput(this, "userPoolArn", {
      value: cognito.userPool.userPoolArn,
      exportName: `${props.stackName}:userPool:Arn`
    })
    new CfnOutput(this, "userPoolId", {
      value: cognito.userPool.userPoolId,
      exportName: `${props.stackName}:userPool:Id`
    })
    new CfnOutput(this, "userPoolClientId", {
      value: cognito.userPoolClient.userPoolClientId,
      exportName: `${props.stackName}:userPoolClient:userPoolClientId`
    })

    nagSuppressions(this)
  }
}
