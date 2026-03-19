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
import {SharedSecrets} from "../resources/SharedSecrets"

export interface StatefulResourcesStackProps extends StandardStackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly fullCloudfrontDomain: string
  readonly cognitoCertificate: Certificate
  readonly useCustomCognitoDomain: boolean
  readonly shortCognitoDomain: string
  readonly fullCognitoDomain: string
  readonly primaryOidcConfig: OidcConfig
  readonly mockOidcConfig?: OidcConfig
  readonly route53ExportName: string
  readonly logRetentionInDays: number
  readonly rumCloudwatchLogEnabled: boolean
  readonly allowLocalhostAccess: boolean
}

/**
 * Clinical Prescription Tracker UI Stateful Resources
 */

export class StatefulResourcesStack extends Stack {
  public readonly staticContentBucket: StaticContentBucket
  public readonly dynamodb: Dynamodb
  public readonly cognito: Cognito
  public readonly rum: Rum
  public readonly sharedSecrets: SharedSecrets

  public constructor(scope: App, id: string, props: StatefulResourcesStackProps){
    super(scope, id, props)

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
      allowLocalhostAccess: props.allowLocalhostAccess,
      useCustomCognitoDomain: props.useCustomCognitoDomain
    })

    this.rum = new Rum(this, "Rum", {
      topLevelDomain: props.fullCloudfrontDomain,
      serviceName: props.serviceName,
      logRetentionInDays: props.logRetentionInDays,
      cwLogEnabled: props.rumCloudwatchLogEnabled,
      allowLocalhostAccess: props.allowLocalhostAccess,
      staticContentBucket: this.staticContentBucket.bucket
    })

    // SharedSecrets
    this.sharedSecrets = new SharedSecrets(this, "SharedSecrets", {
      stackName: props.stackName,
      deploymentRole: deploymentRole,
      useMockOidc: !!props.mockOidcConfig
    })

    // Exports
    new CfnOutput(this, "rumAppName", {
      value: this.rum.rumApp.ref,
      exportName: `${props.stackName}:rum:rumApp:Name`
    })

    if (props.allowLocalhostAccess) {
      new CfnOutput(this, "primaryOidcClientId", {
        value: props.primaryOidcConfig.clientId,
        exportName: `${props.stackName}:local:primaryOidcClientId`
      })
      if (props.mockOidcConfig) {
        new CfnOutput(this, "mockOidcClientId", {
          value: props.mockOidcConfig.clientId,
          exportName: `${props.stackName}:local:mockOidcClientId`
        })
      }
    }

    nagSuppressions(this, !!props.mockOidcConfig)
  }
}
