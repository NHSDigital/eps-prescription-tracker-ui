import {createApp} from "@nhsdigital/eps-cdk-constructs"

const {app, props} = createApp({
  productName: "Prescription Tracker UI",
  appName: "MainDeploymentApp",
  repoName: "eps-prescription-tracker-ui",
  driftDetectionGroup: "cpt-ui",
  serviceCategory: "Silver"
})

// calculate full domain names
let fullCloudfrontDomain
if (props.environment === "prod" || props.environment === "int") {
  fullCloudfrontDomain = epsDomainName
} else {
  fullCloudfrontDomain = `${props.shortCloudfrontDomain}.${epsDomainName}`
}
