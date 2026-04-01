import {App} from "aws-cdk-lib"
import {StandardStackProps, calculateVersionedStackName} from "@nhsdigital/eps-cdk-constructs"
import {UsCertsStack} from "../stacks/UsCertsStack"
import {StatefulResourcesStack} from "../stacks/StatefulResourcesStack"
import {StatelessResourcesStack} from "../stacks/StatelessResourcesStack"
import {UsStatelessStack} from "../stacks/UsStatelessStack"
import {FrontDoorStack} from "../stacks/FrontDoorStack"
import {AllowList} from "../resources/WebApplicationFirewall"
import {addCfnGuardMetadata} from "../nagSuppressions"

type GithubMetadata = {
  actions: Array<string>
}

export type StacksConfig = {
  serviceName: string
  logRetentionInDays: number
  rumCloudwatchLogEnabled: boolean
  useMockOidc: boolean
  primaryOidcClientId: string
  mockOidcClientId: string
  cloudfrontOriginCustomHeader: string
  jwtKid: string
  logLevel: string
  reactLogLevel: string
  splunkDeliveryStream: string
  splunkSubscriptionFilterRole: string
  epsDomainName: string
  epsHostedZoneId: string
}

export async function createAllStacks(app: App, props: StandardStackProps, config: StacksConfig) {
  const useZoneApex = props.environment === "prod" || props.environment === "int"
  const route53ExportName = useZoneApex ? "CPT" : "EPS"
  const serviceName = config.serviceName
  const logRetentionInDays = config.logRetentionInDays
  const csocUSWafDestination = props.environment === "prod"
    ? "arn:aws:logs:us-east-1:693466633220:destination:waf_log_destination_virginia"
    : undefined
  const csocUKWafDestination = props.environment === "prod"
    ? "arn:aws:logs:eu-west-2:693466633220:destination:waf_log_destination"
    : undefined
  const cis2Domain = props.environment === "prod"
    ? "am.nhsidentity.spineservices.nhs.uk"
    : "am.nhsint.auth-ptl.cis2.spineservices.nhs.uk"
  const cis2BaseUrl = `https://${cis2Domain}:443/openam/oauth2/realms/root/realms/NHSIdentity/realms/Healthcare`
  const primaryOidcConfig = {
    clientId: config.primaryOidcClientId,
    issuer: cis2BaseUrl,
    authorizeEndpoint: `${cis2BaseUrl}/authorize`,
    userInfoEndpoint: `${cis2BaseUrl}/userinfo`,
    jwksEndpoint: `${cis2BaseUrl}/connect/jwk_uri`,
    tokenEndpoint: `${cis2BaseUrl}/access_token`
  }
  let targetApigeeEnv
  switch (props.environment) {
    case "prod":
      targetApigeeEnv = "prod"
      break
    case "int":
      targetApigeeEnv = "int"
      break
    case "ref":
      targetApigeeEnv = "ref"
      break
    case "qa":
      targetApigeeEnv = "internal-qa"
      break
    default:
      targetApigeeEnv = "internal-dev"
  }
  const apigeeDomain = targetApigeeEnv === "prod" ? "api.service.nhs.uk" : `${targetApigeeEnv}.api.service.nhs.uk`
  const apigeeDoHSEndpoint = targetApigeeEnv === "prod"
    ? "https://api.service.nhs.uk/service-search-api/"
    : `https://int.api.service.nhs.uk/service-search-api/`
  const mockIdentityBaseUrl = `https://identity.ptl.api.platform.nhs.uk/realms/Cis2-mock-${targetApigeeEnv}`
  const mockOidcConfig = config.useMockOidc
    ? {
      clientId: config.mockOidcClientId,
      issuer: mockIdentityBaseUrl,
      authorizeEndpoint: `https://${apigeeDomain}/oauth2-mock/authorize`,
      tokenEndpoint: `https://${apigeeDomain}/oauth2-mock/token`,
      userInfoEndpoint: `https://${apigeeDomain}/oauth2-mock/userinfo`,
      jwksEndpoint: `${mockIdentityBaseUrl}/protocol/openid-connect/certs`
    }
    : undefined
  const parentCognitoDomain = useZoneApex ? "auth" : `auth.${serviceName}`
  const fullCloudfrontDomain = useZoneApex ? config.epsDomainName : `${serviceName}.${config.epsDomainName}`
  const allowLocalhostAccess = props.environment === "dev" || props.isPullRequest

  let githubAllowList: AllowList | undefined
  if (props.environment !== "prod" && props.environment !== "int") {
    const githubMetadataResponse = await fetch("https://api.github.com/meta")
    const githubMetadata: GithubMetadata = await githubMetadataResponse.json()
    githubAllowList = {
      ipv4: githubMetadata.actions.filter(ip => ip.includes(".")),
      ipv6: githubMetadata.actions.filter(ip => !ip.includes("."))
    }
  }

  const usCertsStack = new UsCertsStack(app, "UsCertsStack", {
    ...props,
    env: {
      region: "us-east-1"
    },
    crossRegionReferences: true,
    serviceName,
    stackName: `${serviceName}-us-certs`,
    epsDomainName: config.epsDomainName,
    epsHostedZoneId: config.epsHostedZoneId,
    fullCloudfrontDomain,
    parentCognitoDomain,
    githubAllowList,
    splunkDeliveryStream: config.splunkDeliveryStream,
    splunkSubscriptionFilterRole: config.splunkSubscriptionFilterRole,
    logRetentionInDays,
    csocUSWafDestination
  })

  const statefulResourcesStack = new StatefulResourcesStack(app, "StatefulStack", {
    ...props,
    crossRegionReferences: true,
    serviceName,
    stackName: `${serviceName}-stateful-resources`,
    fullCloudfrontDomain,
    cognitoCertificate: usCertsStack.cognitoCertificate,
    useCustomCognitoDomain: !props.isPullRequest,
    shortCognitoDomain: props.isPullRequest ? serviceName : parentCognitoDomain,
    fullCognitoDomain: usCertsStack.fullCognitoDomain,
    route53ExportName,
    logRetentionInDays,
    rumCloudwatchLogEnabled: config.rumCloudwatchLogEnabled,
    primaryOidcConfig,
    mockOidcConfig,
    allowLocalhostAccess
  })

  const statelessResourcesStack = new StatelessResourcesStack(app, "StatelessStack", {
    ...props,
    crossRegionReferences: true,
    serviceName,
    stackName: calculateVersionedStackName(serviceName, props),
    apigeeCIS2TokenEndpoint: targetApigeeEnv === "internal_qa"
      ? `https://${apigeeDomain}/oauth2-int/token`
      : `https://${apigeeDomain}/oauth2/token`,
    apigeeDoHSEndpoint: apigeeDoHSEndpoint,
    apigeeMockTokenEndpoint: `https://${apigeeDomain}/oauth2-mock/token`,
    apigeePersonalDemographicsEndpoint: `https://${apigeeDomain}/personal-demographics/FHIR/R4/`,
    apigeePrescriptionsEndpoint: `https://${apigeeDomain}/clinical-prescription-tracker/`,
    cloudfrontCert: usCertsStack.cloudfrontCert,
    cloudfrontOriginCustomHeader: config.cloudfrontOriginCustomHeader,
    cognito: statefulResourcesStack.cognito,
    dynamodb: statefulResourcesStack.dynamodb,
    fullCloudfrontDomain,
    fullCognitoDomain: usCertsStack.fullCognitoDomain,
    jwtKid: config.jwtKid,
    logLevel: config.logLevel,
    reactLogLevel: config.reactLogLevel,
    logRetentionInDays,
    primaryOidcConfig,
    mockOidcConfig,
    staticContentBucket: statefulResourcesStack.staticContentBucket,
    webAclUS: usCertsStack.webAcl,
    allowLocalhostAccess,
    csocUKWafDestination,
    rum: statefulResourcesStack.rum,
    sharedSecrets: statefulResourcesStack.sharedSecrets,
    githubAllowList
  })

  const usStatelessStack = new UsStatelessStack(app, "UsStatelessStack", {
    ...props,
    env: {
      region: "us-east-1"
    },
    crossRegionReferences: true,
    stackName: calculateVersionedStackName(`${serviceName}-us`, props),
    cloudfrontDistribution: statelessResourcesStack.cloudfrontDistribution,
    cloudfrontLogDelivery: usCertsStack.logDelivery
  })

  new FrontDoorStack(app, "FrontDoorStack", {
    ...props,
    serviceName,
    stackName: `${serviceName}-front-door`,
    route53ExportName,
    useZoneApex,
    cloudfrontDistribution: statelessResourcesStack.cloudfrontDistribution
  })

  // run a synth to add cross region lambdas and roles
  app.synth()

  // add metadata so they don't get flagged as failing cfn-guard
  addCfnGuardMetadata(usCertsStack)
  addCfnGuardMetadata(statefulResourcesStack)
  addCfnGuardMetadata(statelessResourcesStack)
  addCfnGuardMetadata(usStatelessStack)

  // finally run synth again with force to include the added metadata
  app.synth({
    force: true
  })
}
