import {createApp} from "@nhsdigital/eps-cdk-constructs"
import {getCloudFormationExports, getCFConfigValue} from "@nhsdigital/eps-deployment-utils"
import readline from "node:readline/promises"
import {createAllStacks} from "./CreateAllStacks"

async function main() {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout})
  const prId = await rl.question("What is the pull request id?")
  rl.close()
  const serviceName = `cpt-ui-pr-${prId}`
  process.env.CDK_CONFIG_versionNumber = `PR-${prId}`
  process.env.CDK_CONFIG_commitId = "static-pr"
  process.env.CDK_CONFIG_isPullRequest = "true"
  process.env.CDK_CONFIG_environment = "dev-pr"
  const {app, props} = createApp({
    productName: "Prescription Tracker UI",
    appName: "MainDeploymentApp", // used in a tag so use the same value to not trigger a change
    repoName: "eps-prescription-tracker-ui",
    driftDetectionGroup: "cpt-ui",
    serviceCategory: "Silver"
  })

  const exports = await getCloudFormationExports()
  createAllStacks(app, props, {
    serviceName,
    logRetentionInDays: 30,
    rumCloudwatchLogEnabled: true,
    useMockOidc: true,
    primaryOidcClientId: getCFConfigValue(exports, `${serviceName}:local:primaryOidcClientId`),
    mockOidcClientId: getCFConfigValue(exports, `${serviceName}:local:mockOidcClientId`),
    cloudfrontOriginCustomHeader: getCFConfigValue(exports, `${serviceName}:local:cloudfrontOriginCustomHeader`),
    jwtKid: "eps-cpt-ui-dev",
    logLevel: "DEBUG",
    reactLogLevel: "debug",
    splunkDeliveryStream: getCFConfigValue(exports, "lambda-resources:SplunkDeliveryStream"),
    splunkSubscriptionFilterRole: getCFConfigValue(exports, "lambda-resources:SplunkSubscriptionFilterRole"),
    epsDomainName: getCFConfigValue(exports, `eps-route53-resources:EPS-domain`),
    epsHostedZoneId: getCFConfigValue(exports, `eps-route53-resources:EPS-ZoneID`)
  })
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Error deploying the app:", error)
  process.exit(1)
})
