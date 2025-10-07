import {APP_CONFIG, RUM_CONFIG} from "@/constants/environment"
import {AwsRum, AwsRumConfig, Telemetry} from "aws-rum-web"
import {readItemGroupFromLocalStorage} from "./useLocalStorageState"

export class CptAwsRum {
  awsRum: AwsRum | null

  constructor() {
    const {epsCookieConsent: consent} = readItemGroupFromLocalStorage("epsCookieConsent") || {}
    const allowCookies = consent ? consent === "accepted" : false
    this.awsRum = this.initRum(allowCookies) // initialize with cookies disabled
  }

  public getAwsRum() {
    return this.awsRum
  }

  // rum client does not work properly when enabling or disabling cookies
  // for now we re-create the client on settings change
  // but when the issue/pull request below are resolved, then we should not need to
  // https://github.com/aws-observability/aws-rum-web/issues/699
  // https://github.com/aws-observability/aws-rum-web/pull/698
  public disable() {
    //this.awsRum?.allowCookies(false)
    this.awsRum = this.initRum(false) // re-initialize with cookies disabled
  }

  public enable() {
    //this.awsRum?.allowCookies(true)
    this.awsRum = this.initRum(true) // re-initialize with cookies enabled
  }

  public dispatchRumEvent() {
    this.awsRum?.dispatch()
  }

  private initRum(allowCookies: boolean) {
    let awsRum: AwsRum | null = null
    // see if we have already accepted cookies
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
        sessionEventLimit: 0,
        cookieAttributes: {secure: true, sameSite: "strict"},
        sessionAttributes: {
          cptAppVersion: APP_CONFIG.VERSION_NUMBER,
          cptAppCommit: APP_CONFIG.COMMIT_ID
        }
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
