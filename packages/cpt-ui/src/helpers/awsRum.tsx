import {RUM_CONFIG} from "@/constants/environment"
import {AwsRum, AwsRumConfig, Telemetry} from "aws-rum-web"

export class CptAwsRum {
  awsRum: AwsRum | null

  constructor() {
    this.awsRum = this.initRum(false) // initialize with cookies disabled
  }

  public getAwsRum() {
    return this.awsRum
  }

  public disable() {
    this.awsRum = this.initRum(false) // re-initialize with cookies disabled
  }

  public enable() {
    this.awsRum = this.initRum(true) // re-initialize with cookies enabled
  }

  public dispatchRumEvent() {
    this.awsRum?.dispatch()
  }

  private initRum(allowCookies: boolean) {
    let awsRum: AwsRum | null = null
    try {
      let telemetries: Array<Telemetry> = RUM_CONFIG.TELEMETRIES
      if (telemetries.includes("http")) {
      // remove http logging to prevent PID leakage
        telemetries = telemetries.filter(item => item !== "http")
      }
      const config: AwsRumConfig = {
        sessionSampleRate: RUM_CONFIG.SESSION_SAMPLE_RATE,
        guestRoleArn: RUM_CONFIG.GUEST_ROLE_ARN,
        identityPoolId: RUM_CONFIG.IDENTITY_POOL_ID,
        endpoint: RUM_CONFIG.ENDPOINT,
        telemetries: telemetries,
        allowCookies: allowCookies,
        enableXRay: RUM_CONFIG.ENABLE_XRAY,
        releaseId: RUM_CONFIG.RELEASE_ID,
        disableAutoPageView: true,
        sessionEventLimit: 0,
        cookieAttributes: {secure: true, sameSite: "strict"}
      }
      awsRum = new AwsRum(RUM_CONFIG.APPLICATION_ID, RUM_CONFIG.VERSION, RUM_CONFIG.REGION, config)
    } catch (error) {
      // we use console log here as otherwise it would get sent to rum
      // eslint-disable-next-line no-console
      console.error("AWS RUM initialization error:", error)
      awsRum = null
    }
    return awsRum
  }
}

export const cptAwsRum = new CptAwsRum()
