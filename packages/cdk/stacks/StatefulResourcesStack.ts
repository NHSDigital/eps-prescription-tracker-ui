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
import {Rum} from "../resources/Rum"

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
    const primaryOidcIssuer = this.node.tryGetContext("primaryOidcIssuer")
    const primaryOidcAuthorizeEndpoint = this.node.tryGetContext("primaryOidcAuthorizeEndpoint")
    const primaryOidcUserInfoEndpoint = this.node.tryGetContext("primaryOidcUserInfoEndpoint")
    const primaryOidcjwksEndpoint = this.node.tryGetContext("primaryOidcjwksEndpoint")
    const primaryOidcTokenEndpoint = this.node.tryGetContext("primaryOidcTokenEndpoint")

    const mockOidcClientId = this.node.tryGetContext("mockOidcClientId")
    const mockOidcIssuer = this.node.tryGetContext("mockOidcIssuer")
    const mockOidcAuthorizeEndpoint = this.node.tryGetContext("mockOidcAuthorizeEndpoint")
    const mockOidcUserInfoEndpoint = this.node.tryGetContext("mockOidcUserInfoEndpoint")
    const mockOidcjwksEndpoint = this.node.tryGetContext("mockOidcjwksEndpoint")
    const mockOidcTokenEndpoint = this.node.tryGetContext("mockOidcTokenEndpoint")

    const useMockOidc: boolean = this.node.tryGetContext("useMockOidc")
    const useCustomCognitoDomain: boolean = this.node.tryGetContext("useCustomCognitoDomain")

    const epsDomainName: string = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId: string = this.node.tryGetContext("epsHostedZoneId")

    const allowAutoDeleteObjects: boolean = this.node.tryGetContext("allowAutoDeleteObjects")
    const cloudfrontDistributionId: string = this.node.tryGetContext("cloudfrontDistributionId")

    const allowLocalhostAccess: boolean = this.node.tryGetContext("allowLocalhostAccess")
    const logRetentionInDays: number = Number(this.node.tryGetContext("logRetentionInDays"))
    const rumCloudwatchLogEnabled: boolean = this.node.tryGetContext("rumCloudwatchLogEnabled")
    const rumAppName: string = this.node.tryGetContext("rumAppName")

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
      deploymentRole: deploymentRole,
      rumAppName: rumAppName,
      region: this.region
    })

    // - Cognito resources
    const cognito = new Cognito(this, "Cognito", {
      primaryOidcClientId: primaryOidcClientId!,
      primaryOidcIssuer: primaryOidcIssuer,
      primaryOidcAuthorizeEndpoint: primaryOidcAuthorizeEndpoint,
      primaryOidcUserInfoEndpoint: primaryOidcUserInfoEndpoint,
      primaryOidcjwksEndpoint: primaryOidcjwksEndpoint,
      primaryOidcTokenEndpoint: primaryOidcTokenEndpoint,
      mockOidcClientId: mockOidcClientId,
      mockOidcIssuer: mockOidcIssuer,
      mockOidcAuthorizeEndpoint: mockOidcAuthorizeEndpoint,
      mockOidcUserInfoEndpoint: mockOidcUserInfoEndpoint,
      mockOidcjwksEndpoint: mockOidcjwksEndpoint,
      mockOidcTokenEndpoint: mockOidcTokenEndpoint,
      useMockOidc: useMockOidc,
      shortCognitoDomain: props.shortCognitoDomain,
      fullCognitoDomain: props.fullCognitoDomain,
      fullCloudfrontDomain: props.fullCloudfrontDomain,
      cognitoCertificate: props.cognitoCertificate,
      hostedZone: hostedZone,
      allowLocalhostAccess: allowLocalhostAccess,
      useCustomCognitoDomain: useCustomCognitoDomain
    })

    // - Dynamodb table for user state
    const dynamodb = new Dynamodb(this, "DynamoDB", {
      stackName: props.stackName,
      account: this.account,
      region: this.region
    })

    // need to make sure the app monitor name is not too long
    const appMonitorName = props.stackName.replace("-stateful-resources", "")
    const rum = new Rum(this, "Rum", {
      topLevelDomain: props.fullCloudfrontDomain,
      appMonitorName: appMonitorName,
      serviceName: props.serviceName,
      stackName: props.stackName,
      logRetentionInDays: logRetentionInDays,
      cwLogEnabled: rumCloudwatchLogEnabled,
      allowLocalhostAccess: allowLocalhostAccess,
      staticContentBucket: staticContentBucket.bucket,
      uploadSourceMaps: staticContentBucket.addRumBucketPolicy?.policyDependable ? true: false
    })

    // add dependency on bucket policy
    if (staticContentBucket.addRumBucketPolicy?.policyDependable) {
      rum.node.addDependency(staticContentBucket.addRumBucketPolicy.policyDependable)
    }
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
    new CfnOutput(this, "StaticContentBucketKmsKeyArn", {
      value: staticContentBucket.kmsKey.keyArn,
      exportName: `${props.stackName}:StaticContentBucketKmsKey:Arn`
    })

    // Token mapping table
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

    // State mapping table
    new CfnOutput(this, "stateMappingTableArn", {
      value: dynamodb.stateMappingTable.tableArn,
      exportName: `${props.stackName}:stateMappingTable:Arn`
    })
    new CfnOutput(this, "stateMappingTableReadPolicyArn", {
      value: dynamodb.stateMappingTableReadPolicy.managedPolicyArn,
      exportName: `${props.stackName}:stateMappingTableReadPolicy:Arn`
    })
    new CfnOutput(this, "stateMappingTableWritePolicyArn", {
      value: dynamodb.stateMappingTableWritePolicy.managedPolicyArn,
      exportName: `${props.stackName}:stateMappingTableWritePolicy:Arn`
    })
    new CfnOutput(this, "useStateMappingKmsKeyPolicyArn", {
      value: dynamodb.useStateMappingKmsKeyPolicy.managedPolicyArn,
      exportName: `${props.stackName}:useStateMappingKmsKeyPolicy:Arn`
    })

    // State mapping table
    new CfnOutput(this, "sessionStateMappingTableArn", {
      value: dynamodb.sessionStateMappingTable.tableArn,
      exportName: `${props.stackName}:sessionStateMappingTable:Arn`
    })
    new CfnOutput(this, "sessionStateMappingTableReadPolicyArn", {
      value: dynamodb.sessionStateMappingTableReadPolicy.managedPolicyArn,
      exportName: `${props.stackName}:sessionStateMappingTableReadPolicy:Arn`
    })
    new CfnOutput(this, "sessionStateMappingTableWritePolicyArn", {
      value: dynamodb.sessionStateMappingTableWritePolicy.managedPolicyArn,
      exportName: `${props.stackName}:sessionStateMappingTableWritePolicy:Arn`
    })
    new CfnOutput(this, "useSessionStateMappingKmsKeyPolicyArn", {
      value: dynamodb.useSessionStateMappingKmsKeyPolicy.managedPolicyArn,
      exportName: `${props.stackName}:useSessionStateMappingKmsKeyPolicy:Arn`
    })

    // User pool stuff
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

    new CfnOutput(this, "unauthenticatedRumRoleArn", {
      value: rum.unauthenticatedRumRole.roleArn,
      exportName: `${props.stackName}:rum:unauthenticatedRumRole:Arn`
    })

    new CfnOutput(this, "identityPoolId", {
      value: rum.identityPool.ref,
      exportName: `${props.stackName}:rum:identityPool:Id`
    })

    new CfnOutput(this, "rumAppId", {
      value: rum.rumApp.attrId,
      exportName: `${props.stackName}:rum:rumApp:Id`
    })

    new CfnOutput(this, "rumAppName", {
      value: rum.rumApp.ref,
      exportName: `${props.stackName}:rum:rumApp:Name`
    })

    new CfnOutput(this, "rumAllowCookies", {
      value: rum.baseAppMonitorConfiguration.allowCookies!.toString(),
      exportName: `${props.stackName}:rum:config:allowCookies`
    })

    new CfnOutput(this, "rumEnableXRay", {
      value: rum.baseAppMonitorConfiguration.enableXRay!.toString(),
      exportName: `${props.stackName}:rum:config:enableXRay`
    })

    new CfnOutput(this, "rumSessionSampleRate", {
      value: rum.baseAppMonitorConfiguration.sessionSampleRate!.toString(),
      exportName: `${props.stackName}:rum:config:sessionSampleRate`
    })

    new CfnOutput(this, "rumTelemetries", {
      value: rum.baseAppMonitorConfiguration.telemetries!.toString(),
      exportName: `${props.stackName}:rum:config:telemetries`
    })

    new CfnOutput(this, "rumLogGroupArn", {
      value: rum.logGroup.logGroupArn,
      exportName: `${props.stackName}:rum:logGroup:arn`
    })

    if (allowLocalhostAccess) {
      new CfnOutput(this, "primaryOidcClientId", {
        value: primaryOidcClientId,
        exportName: `${props.stackName}:local:primaryOidcClientId`
      })
      new CfnOutput(this, "primaryOidcIssuer", {
        value: primaryOidcIssuer,
        exportName: `${props.stackName}:local:primaryOidcIssuer`
      })
      new CfnOutput(this, "primaryOidcAuthorizeEndpoint", {
        value: primaryOidcAuthorizeEndpoint,
        exportName: `${props.stackName}:local:primaryOidcAuthorizeEndpoint`
      })
      new CfnOutput(this, "primaryOidcUserInfoEndpoint", {
        value: primaryOidcUserInfoEndpoint,
        exportName: `${props.stackName}:local:primaryOidcUserInfoEndpoint`
      })
      new CfnOutput(this, "primaryOidcjwksEndpoint", {
        value: primaryOidcjwksEndpoint,
        exportName: `${props.stackName}:local:primaryOidcjwksEndpoint`
      })
      new CfnOutput(this, "primaryOidcTokenEndpoint", {
        value: primaryOidcTokenEndpoint,
        exportName: `${props.stackName}:local:primaryOidcTokenEndpoint`
      })
      if (useMockOidc) {
        new CfnOutput(this, "mockOidcClientId", {
          value: mockOidcClientId,
          exportName: `${props.stackName}:local:mockOidcClientId`
        })
        new CfnOutput(this, "mockOidcIssuer", {
          value: mockOidcIssuer,
          exportName: `${props.stackName}:local:mockOidcIssuer`
        })
        new CfnOutput(this, "mockOidcAuthorizeEndpoint", {
          value: mockOidcAuthorizeEndpoint,
          exportName: `${props.stackName}:local:mockOidcAuthorizeEndpoint`
        })
        new CfnOutput(this, "mockOidcUserInfoEndpoint", {
          value: mockOidcUserInfoEndpoint,
          exportName: `${props.stackName}:local:mockOidcUserInfoEndpoint`
        })
        new CfnOutput(this, "mockOidcjwksEndpoint", {
          value: mockOidcjwksEndpoint,
          exportName: `${props.stackName}:local:mockOidcjwksEndpoint`
        })
        new CfnOutput(this, "mockOidcTokenEndpoint", {
          value: mockOidcTokenEndpoint,
          exportName: `${props.stackName}:local:mockOidcTokenEndpoint`
        })
      }
    }

    nagSuppressions(this)
  }
}
