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
import {OidcConfig} from "../resources/Cognito"

type GithubMetadata = {
  actions: Array<string>
}

function getOidcConfig(prefix: string): OidcConfig {
  return {
    clientId: getConfigFromEnvVar(`${prefix}OidcClientId`),
    issuer: getConfigFromEnvVar(`${prefix}OidcIssuer`),
    authorizeEndpoint: getConfigFromEnvVar(`${prefix}OidcAuthorizeEndpoint`),
    userInfoEndpoint: getConfigFromEnvVar(`${prefix}OidcUserInfoEndpoint`),
    jwksEndpoint: getConfigFromEnvVar(`${prefix}OidcJwksEndpoint`),
    tokenEndpoint: getConfigFromEnvVar(`${prefix}OidcTokenEndpoint`)
  }
}

async function main() {
  const {app, props} = createApp({
    productName: "Prescription Tracker UI",
    appName: "MainDeploymentApp",
    repoName: "eps-prescription-tracker-ui",
    driftDetectionGroup: "cpt-ui",
    serviceCategory: "Silver"
  })

  const exports = await getCloudFormationExports()
  const serviceName = getConfigFromEnvVar("serviceName")
  const splunkDeliveryStream = getCFConfigValue(exports, "lambda-resources:SplunkDeliveryStream")
  const splunkSubscriptionFilterRole = getCFConfigValue(exports, "lambda-resources:SplunkSubscriptionFilterRole")
  const logRetentionInDays = getNumberConfigFromEnvVar("logRetentionInDays")
  const csocUSWafDestination = props.environment === "prod"
    ? "arn:aws:logs:us-east-1:693466633220:destination:waf_log_destination_virginia"
    : undefined
  const csocUKWafDestination = props.environment === "prod"
    ? "arn:aws:logs:eu-west-2:693466633220:destination:waf_log_destination"
    : undefined
  const rumCloudwatchLogEnabled = getBooleanConfigFromEnvVar("rumCloudwatchLogEnabled")
  const primaryOidcConfig = getOidcConfig("primary")
  const mockOidcConfig = getBooleanConfigFromEnvVar("useMockOidc") ? getOidcConfig("mock") : undefined
  const useZoneApex = props.environment === "prod" || props.environment === "int"
  const route53ExportName = useZoneApex ? "CPT" : "EPS"
  const epsDomainName = getCFConfigValue(exports, `eps-route53-resources:${route53ExportName}-domain`)
  const epsHostedZoneId = getCFConfigValue(exports, `eps-route53-resources:${route53ExportName}-ZoneID`)
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
    apigeeApiKey: getConfigFromEnvVar("apigeeApiKey"),
    apigeeApiSecret: getConfigFromEnvVar("apigeeApiSecret"),
    apigeeCIS2TokenEndpoint: getConfigFromEnvVar("apigeeCIS2TokenEndpoint"),
    apigeeDoHSApiKey: getConfigFromEnvVar("apigeeDoHSApiKey"),
    apigeeDoHSEndpoint: getConfigFromEnvVar("apigeeDoHSEndpoint"),
    apigeeMockTokenEndpoint: getConfigFromEnvVar("apigeeMockTokenEndpoint"),
    apigeePersonalDemographicsEndpoint: getConfigFromEnvVar("apigeePersonalDemographicsEndpoint"),
    apigeePrescriptionsEndpoint: getConfigFromEnvVar("apigeePrescriptionsEndpoint"),
    cloudfrontCert: usCertsStack.cloudfrontCert,
    cloudfrontOriginCustomHeader: getConfigFromEnvVar("cloudfrontOriginCustomHeader"),
    cognito: statefulResourcesStack.cognito,
    dynamodb: statefulResourcesStack.dynamodb,
    fullCloudfrontDomain,
    fullCognitoDomain: usCertsStack.fullCognitoDomain,
    jwtPrivateKey: getConfigFromEnvVar("jwtPrivateKey"),
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
    rum: statefulResourcesStack.rum
  })
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Error deploying the app:", error)
  process.exit(1)
})
