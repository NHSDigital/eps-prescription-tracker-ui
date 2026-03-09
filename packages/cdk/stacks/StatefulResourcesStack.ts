import {
  App,
  CfnOutput,
  Fn,
  Stack
} from "aws-cdk-lib"

import {StaticContentBucket} from "../resources/StaticContentBucket"
import {nagSuppressions} from "../nagSuppressions"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"
import {Cognito, OidcConfig} from "../resources/Cognito"
import {Dynamodb} from "../resources/Dynamodb"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {Role} from "aws-cdk-lib/aws-iam"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Rum} from "../resources/Rum"
import {StandardStackProps} from "@nhsdigital/eps-cdk-constructs"

export interface StatefulResourcesStackProps extends StandardStackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly fullCloudfrontDomain: string
  readonly cognitoCertificate: Certificate
  readonly shortCognitoDomain: string
  readonly fullCognitoDomain: string
  readonly primaryOidcConfig: OidcConfig
  readonly mockOidcConfig?: OidcConfig
  readonly route53ExportName: string
  readonly logRetentionInDays: number
  readonly rumCloudwatchLogEnabled: boolean
}

/**
 * Clinical Prescription Tracker UI Stateful Resources
 */

export class StatefulResourcesStack extends Stack {
  public readonly staticContentBucket: StaticContentBucket
  public readonly dynamodb: Dynamodb
  public readonly cognito: Cognito
  public readonly rum: Rum

  public constructor(scope: App, id: string, props: StatefulResourcesStackProps){
    super(scope, id, props)

    const allowLocalhostAccess = props.environment === "dev" || props.isPullRequest

    // Imports
    const auditLoggingBucketImport = Fn.importValue("account-resources:AuditLoggingBucket")
    const deploymentRoleImport = Fn.importValue("ci-resources:CloudFormationDeployRole")
    const epsHostedZoneId = Fn.importValue(`eps-route53-resources:${props.route53ExportName}-ZoneID`)
    const epsDomainName = Fn.importValue(`eps-route53-resources:${props.route53ExportName}-domain`)

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
    this.staticContentBucket = new StaticContentBucket(this, "StaticContentBucket", {
      bucketName: `${props.serviceName}-staticcontentbucket-${this.account}`,
      auditLoggingBucket: auditLoggingBucket,
      deploymentRole: deploymentRole
    })

    // - Dynamodb table for user state
    this.dynamodb = new Dynamodb(this, "DynamoDB", {
      stackName: props.stackName,
      account: this.account,
      region: this.region
    })

    // - Cognito resources
    this.cognito = new Cognito(this, "Cognito", {
      primaryOidcConfig: props.primaryOidcConfig,
      mockOidcConfig: props.mockOidcConfig,
      shortCognitoDomain: props.shortCognitoDomain,
      fullCognitoDomain: props.fullCognitoDomain,
      fullCloudfrontDomain: props.fullCloudfrontDomain,
      cognitoCertificate: props.cognitoCertificate,
      hostedZone: hostedZone,
      allowLocalhostAccess: allowLocalhostAccess,
      useCustomCognitoDomain: !props.isPullRequest
    })

    // need to make sure the app monitor name is not too long
    const appMonitorName = props.stackName.replace("-stateful-resources", "")
    this.rum = new Rum(this, "Rum", {
      topLevelDomain: props.fullCloudfrontDomain,
      appMonitorName: appMonitorName,
      serviceName: props.serviceName,
      stackName: props.stackName,
      logRetentionInDays: props.logRetentionInDays,
      cwLogEnabled: props.rumCloudwatchLogEnabled,
      allowLocalhostAccess: allowLocalhostAccess,
      staticContentBucket: this.staticContentBucket.bucket
    })

    // Exports
    if (allowLocalhostAccess) {
      new CfnOutput(this, "primaryOidcClientId", {
        value: props.primaryOidcConfig.clientId,
        exportName: `${props.stackName}:local:primaryOidcClientId`
      })
      new CfnOutput(this, "primaryOidcIssuer", {
        value: props.primaryOidcConfig.issuer,
        exportName: `${props.stackName}:local:primaryOidcIssuer`
      })
      new CfnOutput(this, "primaryOidcAuthorizeEndpoint", {
        value: props.primaryOidcConfig.authorizeEndpoint,
        exportName: `${props.stackName}:local:primaryOidcAuthorizeEndpoint`
      })
      new CfnOutput(this, "primaryOidcUserInfoEndpoint", {
        value: props.primaryOidcConfig.userInfoEndpoint,
        exportName: `${props.stackName}:local:primaryOidcUserInfoEndpoint`
      })
      new CfnOutput(this, "primaryOidcjwksEndpoint", {
        value: props.primaryOidcConfig.jwksEndpoint,
        exportName: `${props.stackName}:local:primaryOidcjwksEndpoint`
      })
      new CfnOutput(this, "primaryOidcTokenEndpoint", {
        value: props.primaryOidcConfig.tokenEndpoint,
        exportName: `${props.stackName}:local:primaryOidcTokenEndpoint`
      })
      if (props.mockOidcConfig) {
        new CfnOutput(this, "mockOidcClientId", {
          value: props.mockOidcConfig.clientId,
          exportName: `${props.stackName}:local:mockOidcClientId`
        })
        new CfnOutput(this, "mockOidcIssuer", {
          value: props.mockOidcConfig.issuer,
          exportName: `${props.stackName}:local:mockOidcIssuer`
        })
        new CfnOutput(this, "mockOidcAuthorizeEndpoint", {
          value: props.mockOidcConfig.authorizeEndpoint,
          exportName: `${props.stackName}:local:mockOidcAuthorizeEndpoint`
        })
        new CfnOutput(this, "mockOidcUserInfoEndpoint", {
          value: props.mockOidcConfig.userInfoEndpoint,
          exportName: `${props.stackName}:local:mockOidcUserInfoEndpoint`
        })
        new CfnOutput(this, "mockOidcjwksEndpoint", {
          value: props.mockOidcConfig.jwksEndpoint,
          exportName: `${props.stackName}:local:mockOidcjwksEndpoint`
        })
        new CfnOutput(this, "mockOidcTokenEndpoint", {
          value: props.mockOidcConfig.tokenEndpoint,
          exportName: `${props.stackName}:local:mockOidcTokenEndpoint`
        })
      }
    }

    nagSuppressions(this)
  }
}
