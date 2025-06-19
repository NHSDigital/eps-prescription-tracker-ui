import {APP_CONFIG, RUM_CONFIG} from "@/constants/environment"
import {AwsRum, AwsRumConfig, Telemetry} from "aws-rum-web"

export class CptAwsRum {
  awsRum: AwsRum | null

  constructor() {
    try {
      let telemetries: Array<Telemetry> = RUM_CONFIG.TELEMETRIES
      if (telemetries.includes("http")) {
        telemetries = telemetries.filter(item => item !== "http")
        telemetries.push(["http", {
          addXRayTraceIdHeader: true,
          recordAllRequests: true
        }])
      }
      const config: AwsRumConfig = {
        sessionSampleRate: RUM_CONFIG.SESSION_SAMPLE_RATE,
        guestRoleArn: RUM_CONFIG.GUEST_ROLE_ARN,
        identityPoolId: RUM_CONFIG.IDENTITY_POOL_ID,
        endpoint: RUM_CONFIG.ENDPOINT,
        telemetries: telemetries,
        allowCookies: false, // assume no cookies unless they agree
        enableXRay: RUM_CONFIG.ENABLE_XRAY,
        releaseId: RUM_CONFIG.RELEASE_ID,
        sessionEventLimit: 0,
        sessionAttributes: {
          cptAppVersion: APP_CONFIG.VERSION_NUMBER,
          cptAppCommit: APP_CONFIG.COMMIT_ID
        }
      }
      this.awsRum = new AwsRum(RUM_CONFIG.APPLICATION_ID, RUM_CONFIG.VERSION, RUM_CONFIG.REGION, config)
    } catch (error) {
      // we use console log here as otherwise it would get sent to rum
      // eslint-disable-next-line no-console
      console.error("AWS RUM initialization error:", error)
      this.awsRum = null
    }
  }

  public getAwsRum() {
    return this.awsRum
  }

  public disable() {
    this.awsRum?.allowCookies(false)
  }

  public enable() {
    this.awsRum?.allowCookies(true)
  }
}

export const cptAwsRum = new CptAwsRum()
