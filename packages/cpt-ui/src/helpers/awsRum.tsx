import {APP_CONFIG, RUM_CONFIG} from "@/constants/environment"
import {AwsRum, AwsRumConfig} from "aws-rum-web"
let awsRum: AwsRum | null

export function getAwsRum() {
  try {
    const config: AwsRumConfig = {
      sessionSampleRate: RUM_CONFIG.SESSION_SAMPLE_RATE,
      guestRoleArn: RUM_CONFIG.GUEST_ROLE_ARN,
      identityPoolId: RUM_CONFIG.IDENTITY_POOL_ID,
      endpoint: RUM_CONFIG.ENDPOINT,
      telemetries: RUM_CONFIG.TELEMETRIES,
      allowCookies: RUM_CONFIG.ALLOW_COOKIES,
      enableXRay: RUM_CONFIG.ENABLE_XRAY,
      releaseId: RUM_CONFIG.RELEASE_ID,
      sessionAttributes: {
        cptAppVersion: APP_CONFIG.VERSION_NUMBER,
        cptAppCommit: APP_CONFIG.COMMIT_ID
      }
    }
    awsRum = new AwsRum(RUM_CONFIG.APPLICATION_ID, RUM_CONFIG.VERSION, RUM_CONFIG.REGION, config)
  } catch (error) {
    console.error("AWS RUM initialization error:", error)
  }
  return awsRum
}
