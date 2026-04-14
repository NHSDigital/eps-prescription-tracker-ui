import {defineConfig} from "vite"
import {getCloudFormationExports, getCFConfigValue} from "@nhsdigital/eps-deployment-utils"
import {create} from "./vite.base.config"

export default defineConfig(async () => {
  const exports = await getCloudFormationExports()
  const prId = process.env.PULL_REQUEST_ID
  const serviceName = `cpt-ui-pr-${prId}`
  const env = {
    VITE_userPoolId: getCFConfigValue(exports, `${serviceName}:userPool:Id`),
    VITE_userPoolClientId: getCFConfigValue(exports, `${serviceName}:userPoolClient:Id`),
    VITE_hostedLoginDomain: `${serviceName}.auth.eu-west-2.amazoncognito.com`,
    VITE_cloudfrontBaseUrl: "http://localhost:3000",
    VITE_TARGET_ENVIRONMENT: "dev-pr",
    VITE_COMMIT_ID: "static-pr",
    VITE_VERSION_NUMBER: `PR-${prId}`,
    VITE_RUM_GUEST_ROLE_ARN: getCFConfigValue(exports, `${serviceName}:rum:guestRole:Arn`),
    VITE_RUM_IDENTITY_POOL_ID: getCFConfigValue(exports, `${serviceName}:rum:identityPool:Id`),
    VITE_RUM_APPLICATION_ID: getCFConfigValue(exports, `${serviceName}:rum:rumApp:Id`),
    VITE_REACT_LOG_LEVEL: "debug"
  }
  process.env = {
    ...process.env,
    ...env
  }
  return create(env, {
    port: 3000,
    proxy: {
      "/api": {
        target: `https://${serviceName}.dev.eps.national.nhs.uk/ `,
        changeOrigin: true,
        secure: false
      }
    }
  })
})
