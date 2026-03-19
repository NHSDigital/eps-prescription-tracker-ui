import {
  createApp,
  getBooleanConfigFromEnvVar,
  getConfigFromEnvVar,
  getNumberConfigFromEnvVar,
  calculateVersionedStackName
} from "@nhsdigital/eps-cdk-constructs"
import {getCloudFormationExports, getCFConfigValue} from "@nhsdigital/eps-deployment-utils"
import {UsCertsStack} from "../stacks/UsCertsStack"
import {StatefulResourcesStack} from "../stacks/StatefulResourcesStack"
import {StatelessResourcesStack} from "../stacks/StatelessResourcesStack"
import {AllowList} from "../resources/WebApplicationFirewall"

type GithubMetadata = {
  actions: Array<string>
}

async function main() {
  const {app, props} = createApp({
    productName: "Prescription Tracker UI",
    appName: "MainDeploymentApp",
    repoName: "eps-prescription-tracker-ui",
    driftDetectionGroup: "cpt-ui",
    serviceCategory: "Silver"
  })

  const useZoneApex = props.environment === "prod" || props.environment === "int"
  const route53ExportName = useZoneApex ? "CPT" : "EPS"
  let splunkDeliveryStream
  let splunkSubscriptionFilterRole
  let epsDomainName
  let epsHostedZoneId
  if (process.env.DO_NOT_GET_AWS_EXPORT) {
    splunkDeliveryStream = "fakeSplunkDeliveryStream"
    splunkSubscriptionFilterRole = "fakeSplunkSubscriptionFilterRole"
    epsDomainName = "fakeDomainName"
    epsHostedZoneId = "fakeHostedZoneId"
  } else {
    const exports = await getCloudFormationExports()
    splunkDeliveryStream = getCFConfigValue(exports, "lambda-resources:SplunkDeliveryStream")
    splunkSubscriptionFilterRole = getCFConfigValue(exports, "lambda-resources:SplunkSubscriptionFilterRole")
    epsDomainName = getCFConfigValue(exports, `eps-route53-resources:${route53ExportName}-domain`)
    epsHostedZoneId = getCFConfigValue(exports, `eps-route53-resources:${route53ExportName}-ZoneID`)
  }
  const serviceName = getConfigFromEnvVar("serviceName")
  const logRetentionInDays = getNumberConfigFromEnvVar("logRetentionInDays")
  const csocUSWafDestination = props.environment === "prod"
    ? "arn:aws:logs:us-east-1:693466633220:destination:waf_log_destination_virginia"
    : undefined
  const csocUKWafDestination = props.environment === "prod"
    ? "arn:aws:logs:eu-west-2:693466633220:destination:waf_log_destination"
    : undefined
  const rumCloudwatchLogEnabled = getBooleanConfigFromEnvVar("rumCloudwatchLogEnabled")
  const cis2Domain = props.environment === "prod"
    ? "am.nhsidentity.spineservices.nhs.uk"
    : "am.nhsint.auth-ptl.cis2.spineservices.nhs.uk"
  const cis2BaseUrl = `https://${cis2Domain}:443/openam/oauth2/realms/root/realms/NHSIdentity/realms/Healthcare`
  const primaryOidcConfig = {
    clientId: getConfigFromEnvVar(`primaryOidcClientId`),
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
  const mockOidcConfig = getBooleanConfigFromEnvVar("useMockOidc")
    ? {
      clientId: getConfigFromEnvVar(`mockOidcClientId`),
      issuer: mockIdentityBaseUrl,
      authorizeEndpoint: `https://${apigeeDomain}/oauth2-mock/authorize`,
      tokenEndpoint: `https://${apigeeDomain}/oauth2-mock/token`,
      userInfoEndpoint: `https://${apigeeDomain}/oauth2-mock/userinfo`,
      jwksEndpoint: `${mockIdentityBaseUrl}/protocol/openid-connect/certs`
    }
    : undefined
  const parentCognitoDomain = useZoneApex ? "auth" : `auth.${serviceName}`
  const fullCloudfrontDomain = useZoneApex ? epsDomainName : `${serviceName}.${epsDomainName}`
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
    epsDomainName,
    epsHostedZoneId,
    fullCloudfrontDomain,
    parentCognitoDomain,
    githubAllowList,
    splunkDeliveryStream,
    splunkSubscriptionFilterRole,
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
    rumCloudwatchLogEnabled,
    primaryOidcConfig,
    mockOidcConfig,
    allowLocalhostAccess
  })

  new StatelessResourcesStack(app, "StatelessStack", {
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
    cloudfrontOriginCustomHeader: getConfigFromEnvVar("cloudfrontOriginCustomHeader"),
    cognito: statefulResourcesStack.cognito,
    dynamodb: statefulResourcesStack.dynamodb,
    fullCloudfrontDomain,
    fullCognitoDomain: usCertsStack.fullCognitoDomain,
    jwtKid: getConfigFromEnvVar("jwtKid"),
    logDelivery: usCertsStack.logDelivery,
    logLevel: getConfigFromEnvVar("logLevel"),
    reactLogLevel: getConfigFromEnvVar("reactLogLevel"),
    logRetentionInDays,
    primaryOidcConfig,
    mockOidcConfig,
    route53ExportName,
    staticContentBucket: statefulResourcesStack.staticContentBucket,
    useZoneApex,
    webAclUS: usCertsStack.webAcl,
    allowLocalhostAccess,
    csocUKWafDestination,
    rum: statefulResourcesStack.rum,
    sharedSecrets: statefulResourcesStack.sharedSecrets
  })
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Error deploying the app:", error)
  process.exit(1)
})
