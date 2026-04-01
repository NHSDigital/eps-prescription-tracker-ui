import {
  createApp,
  getBooleanConfigFromEnvVar,
  getConfigFromEnvVar,
  getNumberConfigFromEnvVar
} from "@nhsdigital/eps-cdk-constructs"
import {getCloudFormationExports, getCFConfigValue} from "@nhsdigital/eps-deployment-utils"
import {createAllStacks} from "./CreateAllStacks"

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
  createAllStacks(app, props, {
    serviceName: getConfigFromEnvVar("serviceName"),
    logRetentionInDays: getNumberConfigFromEnvVar("logRetentionInDays"),
    rumCloudwatchLogEnabled: getBooleanConfigFromEnvVar("rumCloudwatchLogEnabled"),
    useMockOidc: getBooleanConfigFromEnvVar("useMockOidc"),
    primaryOidcClientId: getConfigFromEnvVar("primaryOidcClientId"),
    mockOidcClientId: getConfigFromEnvVar("mockOidcClientId"),
    cloudfrontOriginCustomHeader: getConfigFromEnvVar("cloudfrontOriginCustomHeader"),
    jwtKid: getConfigFromEnvVar("jwtKid"),
    logLevel: getConfigFromEnvVar("logLevel"),
    reactLogLevel: getConfigFromEnvVar("reactLogLevel"),
    splunkDeliveryStream,
    splunkSubscriptionFilterRole,
    epsDomainName,
    epsHostedZoneId
  })
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Error deploying the app:", error)
  process.exit(1)
})
