import React from "react"
import {render} from "@testing-library/react"
import {AwsRumProvider} from "@/context/AwsRumProvider" // Adjust import path as needed
import {AwsRum} from "aws-rum-web"
import {RUM_CONFIG} from "@/constants/environment"

// Mock aws-rum-web and RUM_CONFIG
jest.mock("aws-rum-web", () => {
  return {
    AwsRum: jest.fn().mockImplementation(() => ({
      allowCookies: jest.fn()
    }))
  }
})

jest.mock("@/constants/environment", () => ({
  RUM_CONFIG: {
    SESSION_SAMPLE_RATE: 1,
    GUEST_ROLE_ARN: "test-role-arn",
    IDENTITY_POOL_ID: "test-pool-id",
    ENDPOINT: "test-endpoint",
    TELEMETRIES: ["performance", "errors"],
    ALLOW_COOKIES: true,
    ENABLE_XRAY: false,
    APPLICATION_ID: "test-app-id",
    VERSION: "1.0.0",
    REGION: "us-west-2",
    RELEASE_ID: "dummy_release_id"
  },
  APP_CONFIG: {
    VERSION_NUMBER: "dummy_version_number",
    COMMIT_ID: "dummy_commit_id"
  }
}))

describe("AwsRumHelper", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it("should initialize AwsRum with correct config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    const rum = new (require("@/helpers/awsRum").CptAwsRum)()

    // Check that AwsRum constructor was called with correct parameters
    expect(AwsRum).toHaveBeenCalledWith(
      RUM_CONFIG.APPLICATION_ID,
      RUM_CONFIG.VERSION,
      RUM_CONFIG.REGION,
      {
        sessionSampleRate: RUM_CONFIG.SESSION_SAMPLE_RATE,
        guestRoleArn: RUM_CONFIG.GUEST_ROLE_ARN,
        identityPoolId: RUM_CONFIG.IDENTITY_POOL_ID,
        endpoint: RUM_CONFIG.ENDPOINT,
        telemetries: RUM_CONFIG.TELEMETRIES,
        allowCookies: false,
        enableXRay: RUM_CONFIG.ENABLE_XRAY,
        releaseId: RUM_CONFIG.RELEASE_ID,
        disableAutoPageView: true,
        sessionEventLimit: 0
      }
    )
    expect(rum.getAwsRum()).not.toBeNull()
  })

  it("should set awsRum to null if constructor throws", () => {
    // Force error
    (AwsRum as jest.Mock).mockImplementationOnce(() => {
      throw new Error("RUM failed")
    })

    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    const rum = new (require("@/helpers/awsRum").CptAwsRum)()
    expect(rum.getAwsRum()).toBeNull()
  })

  it("should call allowCookies(true) on enable", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    const rum = new (require("@/helpers/awsRum").CptAwsRum)()
    const awsRumInstance = rum.getAwsRum()
    rum.enable()

    expect(awsRumInstance?.allowCookies).toHaveBeenCalledWith(true)
  })

  it("should call allowCookies(false) on disable", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    const rum = new (require("@/helpers/awsRum").CptAwsRum)()
    const awsRumInstance = rum.getAwsRum()
    rum.disable()

    expect(awsRumInstance?.allowCookies).toHaveBeenCalledWith(false)
  })
})

describe("AwsRumContext", () => {

  test("renders children correctly", () => {
    const {getByText} = render(
      <AwsRumProvider>
        <div>Test Child Content</div>
      </AwsRumProvider>
    )

    expect(getByText("Test Child Content")).toBeInTheDocument()
  })
})
