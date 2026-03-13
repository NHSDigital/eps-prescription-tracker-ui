import {
  Stack,
  App,
  Fn,
  CfnOutput,
  ArnFormat,
  DockerImage,
  RemovalPolicy
} from "aws-cdk-lib"
import {StandardStackProps} from "@nhsdigital/eps-cdk-constructs"
import {AccessLevel} from "aws-cdk-lib/aws-cloudfront"
import {RestApiOrigin, S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins"

import {RestApiGateway} from "../resources/RestApiGateway"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {nagSuppressions} from "../nagSuppressions"
import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {SharedSecrets} from "../resources/SharedSecrets"
import {OAuth2Functions} from "../resources/api/oauth2Functions"
import {ApiFunctions} from "../resources/api/apiFunctions"
import {Key} from "aws-cdk-lib/aws-kms"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {RestApiGatewayMethods} from "../resources/RestApiGateway/RestApiGatewayMethods"
import {OAuth2ApiGatewayMethods} from "../resources/RestApiGateway/OAuth2ApiGatewayMethods"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate} from "aws-cdk-lib/aws-certificatemanager"
import {AllowList, WebACL} from "../resources/WebApplicationFirewall"
import {CfnWebACLAssociation} from "aws-cdk-lib/aws-wafv2"
import {ukRegionLogGroups} from "../resources/ukRegionLogGroups"
import {Dynamodb} from "../resources/Dynamodb"
import {Cognito, OidcConfig} from "../resources/Cognito"
import {CloudfrontLogDelivery} from "../resources/CloudfrontLogDelivery"
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment"
import {execSync} from "child_process"
import {Rum} from "../resources/Rum"
import {resolve, join, basename} from "path"
import {cpSync, globSync} from "fs"
import {LogGroup} from "aws-cdk-lib/aws-logs"
import {StaticContentBucket} from "../resources/StaticContentBucket"
import {NagSuppressions} from "cdk-nag"

export interface StatelessResourcesStackProps extends StandardStackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly cloudfrontCert: Certificate
  readonly dynamodb: Dynamodb
  readonly route53ExportName: string
  readonly useZoneApex: boolean
  readonly fullCloudfrontDomain: string
  readonly fullCognitoDomain: string
  readonly logRetentionInDays: number
  readonly logLevel: string
  readonly reactLogLevel: string
  readonly primaryOidcConfig: OidcConfig
  readonly mockOidcConfig?: OidcConfig
  readonly apigeeApiKey: string
  readonly apigeeApiSecret: string
  readonly apigeeDoHSApiKey: string
  readonly apigeeCIS2TokenEndpoint: string
  readonly apigeeMockTokenEndpoint: string
  readonly apigeePrescriptionsEndpoint: string
  readonly apigeeDoHSEndpoint: string
  readonly apigeePersonalDemographicsEndpoint: string
  readonly jwtPrivateKey: string
  readonly jwtKid: string
  readonly webAclUS: WebACL
  readonly githubAllowList?: AllowList
  readonly cloudfrontOriginCustomHeader: string
  readonly csocUKWafDestination?: string
  readonly staticContentBucket: StaticContentBucket
  readonly cognito: Cognito
  readonly logDelivery: CloudfrontLogDelivery
  readonly allowLocalhostAccess: boolean
  readonly rum: Rum
}

/**
 * Clinical Prescription Tracker UI Stateless Resources

 */

export class StatelessResourcesStack extends Stack {
  public constructor(scope: App, id: string, props: StatelessResourcesStackProps) {
    super(scope, id, props)

    // Imports
    const cloudwatchKmsKey = Key.fromKeyArn(
      this, "cloudwatchKmsKey", Fn.importValue("account-resources:CloudwatchLogsKmsKeyArn"))
    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("lambda-resources:SplunkDeliveryStream"))
    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole", Fn.importValue("lambda-resources:SplunkSubscriptionFilterRole"))

    const deploymentRole = Role.fromRoleArn(this, "deploymentRole",
      Fn.importValue("ci-resources:CloudFormationDeployRole"))
    const epsHostedZoneId = Fn.importValue(`eps-route53-resources:${props.route53ExportName}-ZoneID`)
    const epsDomainName = Fn.importValue(`eps-route53-resources:${props.route53ExportName}-domain`)
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    // Resources

    // SharedSecrets
    const sharedSecrets = new SharedSecrets(this, "SharedSecrets", {
      stackName: props.stackName,
      deploymentRole: deploymentRole,
      useMockOidc: !!props.mockOidcConfig,
      apigeeApiKey: props.apigeeApiKey,
      apigeeDoHSApiKey: props.apigeeDoHSApiKey,
      apigeeApiSecret: props.apigeeApiSecret,
      jwtPrivateKey: props.jwtPrivateKey
    })

    // Functions for the login OAuth2 proxy lambdas
    const oauth2Functions = new OAuth2Functions(this, "OAuth2Functions", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      fullCognitoDomain: props.fullCognitoDomain,

      fullCloudfrontDomain: props.fullCloudfrontDomain,
      cognito: props.cognito,

      primaryOidcConfig: props.primaryOidcConfig,
      mockOidcConfig: props.mockOidcConfig,

      dynamodb: props.dynamodb,

      sharedSecrets,

      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      jwtKid: props.jwtKid,
      apigeeApiKey: sharedSecrets.apigeeApiKey,
      apigeeApiSecret: sharedSecrets.apigeeApiSecret,
      version: props.version,
      commitId: props.commitId
    })

    // -- functions for API
    const apiFunctions = new ApiFunctions(this, "ApiFunctions", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      primaryOidcConfig: props.primaryOidcConfig,
      mockOidcConfig: props.mockOidcConfig,
      dynamodb: props.dynamodb,
      cognito: props.cognito,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      sharedSecrets: sharedSecrets,
      apigeeCIS2TokenEndpoint: props.apigeeCIS2TokenEndpoint,
      apigeeMockTokenEndpoint: props.apigeeMockTokenEndpoint,
      apigeePrescriptionsEndpoint: props.apigeePrescriptionsEndpoint,
      apigeeDoHSEndpoint: props.apigeeDoHSEndpoint,
      apigeeApiKey: sharedSecrets.apigeeApiKey,
      apigeeDoHSApiKey: sharedSecrets.apigeeDoHSApiKey,
      apigeeApiSecret: sharedSecrets.apigeeApiSecret,
      jwtKid: props.jwtKid,
      apigeePersonalDemographicsEndpoint: props.apigeePersonalDemographicsEndpoint,
      fullCloudfrontDomain: props.fullCloudfrontDomain,
      version: props.version,
      commitId: props.commitId
    })

    const logGroups = new ukRegionLogGroups(this, "ukRegionLogGroups", {
      cloudwatchKmsKey: cloudwatchKmsKey,
      logRetentionInDays: props.logRetentionInDays,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole,
      // waf log groups must start with aws-waf-logs-
      wafLogGroupName: `aws-waf-logs-${props.serviceName}-apigw`,
      stackName: this.stackName,
      csocUKWafDestination: props.csocUKWafDestination
    })

    // API Gateway WAF Web ACL
    const webAcl = new WebACL(this, "WebAclApiGateway", {
      serviceName: props.serviceName,
      rateLimitTransactions: 3000, // 50 TPS
      rateLimitWindowSeconds: 60, // Minimum is 60 seconds
      githubAllowList: props.githubAllowList,
      scope: "REGIONAL",
      allowedHeaders: new Map<string, string>([
        ["X-Cloudfront-Origin-Secret", props.cloudfrontOriginCustomHeader]
      ]),
      // waf log destination must not have :* at the end
      // see https://stackoverflow.com/a/73372989/9294145
      wafLogGroupName: Stack.of(this).formatArn({
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        service: "logs",
        resource: "log-group",
        resourceName: logGroups.wafLogGroup.logGroupName
      })
    })

    // - CPT backend API Gateway (/api/*)
    const apiGateway = new RestApiGateway(this, "ApiGateway", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      cloudwatchKmsKey: cloudwatchKmsKey,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole,
      userPool: props.cognito.userPool
    })

    // OAuth2 endpoints get their own API Gateway (/oauth2/*)
    const oauth2Gateway = new RestApiGateway(this, "OAuth2Gateway", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      logRetentionInDays: props.logRetentionInDays,
      logLevel: props.logLevel,
      cloudwatchKmsKey: cloudwatchKmsKey,
      splunkDeliveryStream: splunkDeliveryStream,
      splunkSubscriptionFilterRole: splunkSubscriptionFilterRole
    })

    // Associate API Gateways to the WAF
    new CfnWebACLAssociation(this, "apiGatewayAssociation", {
      resourceArn: apiGateway.stageArn,
      webAclArn: webAcl.attrArn
    })

    new CfnWebACLAssociation(this, "oauth2GatewayAssociation", {
      resourceArn: oauth2Gateway.stageArn,
      webAclArn: webAcl.attrArn
    })

    // --- Methods & Resources
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiMethods = new RestApiGatewayMethods(this, "RestApiGatewayMethods", {
      executePolices: [
        ...apiFunctions.apiFunctionsPolicies
      ],
      CIS2SignOutLambda: apiFunctions.CIS2SignOutLambda,
      restAPiGatewayRole: apiGateway.apiGatewayRole,
      restApiGateway: apiGateway.apiGateway,
      prescriptionListLambda: apiFunctions.prescriptionListLambda,
      prescriptionDetailsLambda: apiFunctions.prescriptionDetailsLambda,
      trackerUserInfoLambda: apiFunctions.trackerUserInfoLambda,
      sessionManagementLambda: apiFunctions.sessionManagementLambda,
      selectedRoleLambda: apiFunctions.selectedRoleLambda,
      patientSearchLambda: apiFunctions.patientSearchLambda,
      authorizer: apiGateway.authorizer,
      clearActiveSessionLambda: apiFunctions.clearActiveSessionLambda,
      useMockOidc: !!props.mockOidcConfig
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const oauth2Methods = new OAuth2ApiGatewayMethods(this, "OAuth2ApiGatewayMethods", {
      executePolices: [
        ...oauth2Functions.oAuth2Policies
      ],
      oauth2APiGatewayRole: oauth2Gateway.apiGatewayRole,
      oauth2ApiGateway: oauth2Gateway.apiGateway,
      tokenLambda: oauth2Functions.tokenLambda,
      mockTokenLambda: oauth2Functions.mockTokenLambda,
      authorizeLambda: oauth2Functions.authorizeLambda,
      mockAuthorizeLambda: oauth2Functions.mockAuthorizeLambda,
      callbackLambda: oauth2Functions.callbackLambda,
      mockCallbackLambda: oauth2Functions.mockCallbackLambda,
      useMockOidc: !!props.mockOidcConfig
    })

    // - Cloudfront
    // --- Origins for bucket and api gateway
    const staticContentDeploymentLogGroup = new LogGroup(this, "StaticContentDeploymentLogGroup", {
      encryptionKey: cloudwatchKmsKey,
      logGroupName: `/aws/lambda/${props.stackName}-static-content-deployment`,
      retention: props.logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })
    const staticContentDeploymentPolicy = new ManagedPolicy(this, "StaticContentDeploymentPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "s3:ListBucket",
            "s3:DeleteObject",
            "s3:PutObject"
          ],
          resources: [
            props.staticContentBucket.bucket.bucketArn,
            props.staticContentBucket.bucket.arnForObjects(props.version + "/*")
          ]
        }),
        new PolicyStatement({
          actions: [
            "kms:Decrypt",
            "kms:Encrypt",
            "kms:GenerateDataKey"
          ],
          resources: [props.staticContentBucket.kmsKey.keyArn]
        }),
        new PolicyStatement({
          actions: [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          resources: [
            staticContentDeploymentLogGroup.logGroupArn,
            `${staticContentDeploymentLogGroup.logGroupArn}:log-stream:*`
          ]
        })
      ]
    })
    NagSuppressions.addResourceSuppressions(staticContentDeploymentPolicy, [
      {
        id: "AwsSolutions-IAM5",
        // eslint-disable-next-line max-len
        reason: "Suppress error for not having wildcards in permissions. This is a fine as we need to have permissions on all log streams under path"
      }
    ])
    const staticContentDeploymentRole = new Role(this, "StaticContentDeploymentRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [staticContentDeploymentPolicy]
    }).withoutPolicyUpdates()
    const mainDeployment = new BucketDeployment(this, "StaticContentDeployment", {
      sources: [
        Source.asset("../cpt-ui/dist", {
          bundling: {
            local: {
              tryBundle(outputDir, options) {
                const root = resolve("../..")
                execSync(
                  `npm run build --workspace packages/cpt-ui`,
                  {cwd: root, env: {...process.env, ...options.environment}, stdio: "inherit"}
                )
                cpSync(join(root, "packages", "cpt-ui", "dist"), outputDir, {recursive: true})
                return true
              }
            },
            image: DockerImage.fromRegistry("alpine"), // unused but required
            environment: {
              VITE_userPoolId: props.cognito.userPool.userPoolId,
              VITE_userPoolClientId: props.cognito.userPoolClient.userPoolClientId,
              VITE_hostedLoginDomain: props.fullCognitoDomain,
              VITE_fullCloudfrontDomain: props.fullCloudfrontDomain,
              VITE_TARGET_ENVIRONMENT: props.environment,
              VITE_SERVICE_NAME: props.serviceName,
              VITE_COMMIT_ID: props.commitId,
              VITE_VERSION_NUMBER: props.version,
              VITE_RUM_GUEST_ROLE_ARN: props.rum.guestRole.roleArn,
              VITE_RUM_IDENTITY_POOL_ID: props.rum.identityPool.ref,
              VITE_RUM_APPLICATION_ID: props.rum.rumApp.attrId,
              VITE_REACT_LOG_LEVEL: props.reactLogLevel
            }
          }
        }),
        Source.asset("../staticContent", {exclude: ["jwks"]}),
        Source.asset(`../staticContent/jwks/${props.environment}`)
      ],
      destinationKeyPrefix: props.version,
      destinationBucket: props.staticContentBucket.bucket,
      retainOnDelete: false,
      role: staticContentDeploymentRole,
      logGroup: staticContentDeploymentLogGroup
    })
    const sourceMapsDeployment = new BucketDeployment(this, "SourceMapsDeployment", {
      sources: [Source.asset("../cpt-ui/dist", {
        bundling: {
          local: {
            tryBundle(outputDir) {
              for (const file of globSync(resolve("../..") + "/packages/cpt-ui/dist/**/*.map")) {
                cpSync(file, join(outputDir, basename(file)))
              }
              return true
            }
          },
          image: DockerImage.fromRegistry("alpine") // unused but required
        }
      })],
      destinationKeyPrefix: `source_maps/${props.commitId}/site/assets`,
      destinationBucket: mainDeployment.deployedBucket,
      retainOnDelete: false,
      role: staticContentDeploymentRole,
      logGroup: staticContentDeploymentLogGroup
    })
    const staticContentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      sourceMapsDeployment.deployedBucket,
      {
        originAccessLevels: [AccessLevel.READ],
        originPath: "/" + props.version
      }
    )

    const apiGatewayOrigin = new RestApiOrigin(apiGateway.apiGateway, {
      customHeaders: {
        "destination-api-apigw-id": apiGateway.apiGateway.restApiId, // for later apigw waf stuff
        "X-Cloudfront-Origin-Secret": props.cloudfrontOriginCustomHeader // Sets custom header used by WAF
      }
    })

    const oauth2GatewayOrigin = new RestApiOrigin(oauth2Gateway.apiGateway, {
      customHeaders: {
        "destination-oauth2-apigw-id": oauth2Gateway.apiGateway.restApiId, // for later apigw waf stuff
        "X-Cloudfront-Origin-Secret": props.cloudfrontOriginCustomHeader // Sets custom header used by WAF
      }
    })

    // --- Distribution
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cloudfrontDistribution = new CloudfrontDistribution(this, "CloudfrontDistribution", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      hostedZone: hostedZone,
      cloudfrontCert: props.cloudfrontCert,
      useZoneApex: props.useZoneApex,
      fullCloudfrontDomain: props.fullCloudfrontDomain,
      webAcl: props.webAclUS,
      wafAllowGaRunnerConnectivity: !!props.githubAllowList,
      logDelivery: props.logDelivery,
      apiGatewayOrigin: apiGatewayOrigin,
      oauth2GatewayOrigin: oauth2GatewayOrigin,
      staticContentBucketOrigin: staticContentBucketOrigin,
      fullCognitoDomain: props.fullCognitoDomain
    })

    // Outputs

    // Exports
    if (props.allowLocalhostAccess) {
      new CfnOutput(this, "apigeeApiKey", {
        value: props.apigeeApiKey,
        exportName: `${props.stackName}:local:apigeeApiKey`
      })
      new CfnOutput(this, "apigeeApiSecret", {
        value: props.apigeeApiSecret,
        exportName: `${props.stackName}:local:apigeeApiSecret`
      })
      new CfnOutput(this, "apigeeCIS2TokenEndpoint", {
        value: props.apigeeCIS2TokenEndpoint,
        exportName: `${props.stackName}:local:apigeeCIS2TokenEndpoint`
      })
      new CfnOutput(this, "apigeeDoHSApiKey", {
        value: props.apigeeDoHSApiKey,
        exportName: `${props.stackName}:local:apigeeDoHSApiKey`
      })
      if (props.mockOidcConfig) {
        new CfnOutput(this, "apigeeMockTokenEndpoint", {
          value: props.apigeeMockTokenEndpoint,
          exportName: `${props.stackName}:local:apigeeMockTokenEndpoint`
        })
      }
      new CfnOutput(this, "apigeePrescriptionsEndpoint", {
        value: props.apigeePrescriptionsEndpoint,
        exportName: `${props.stackName}:local:apigeePrescriptionsEndpoint`
      })
      new CfnOutput(this, "apigeePersonalDemographicsEndpoint", {
        value: props.apigeePersonalDemographicsEndpoint,
        exportName: `${props.stackName}:local:apigeePersonalDemographicsEndpoint`
      })
      new CfnOutput(this, "apigeeDoHSEndpoint", {
        value: props.apigeeDoHSEndpoint,
        exportName: `${props.stackName}:local:apigeeDoHSEndpoint`
      })
      new CfnOutput(this, "jwtKid", {
        value: props.jwtKid,
        exportName: `${props.stackName}:local:jwtKid`
      })
      new CfnOutput(this, "VERSION_NUMBER", {
        value: props.version,
        exportName: `${props.stackName}:local:VERSION-NUMBER`
      })
      new CfnOutput(this, "COMMIT_ID", {
        value: props.commitId,
        exportName: `${props.stackName}:local:COMMIT-ID`
      })
    }
    nagSuppressions(this, !!props.mockOidcConfig)
  }
}
