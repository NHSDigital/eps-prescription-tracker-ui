import React from "react"
import {render} from "@testing-library/react"
import {AwsRumProvider, useAwsRum} from "@/context/AwsRumProvider" // Adjust import path as needed
import {AwsRum} from "aws-rum-web"
import {RUM_CONFIG} from "@/constants/environment"

// Mock aws-rum-web and RUM_CONFIG
jest.mock("aws-rum-web", () => ({
  AwsRum: jest.fn()
}))

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
    REGION: "us-west-2"
  }
}))

// Test component to check useAwsRum hook
const TestComponent = () => {
  const awsRum = useAwsRum()
  return <div data-testid="rum-test">{awsRum ? "RUM Initialized" : "RUM Not Initialized"}</div>
}

describe("AwsRumProvider", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  test("creates AwsRum instance with correct configuration", () => {
    render(<AwsRumProvider><div>Test Child</div></AwsRumProvider>)

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
        allowCookies: RUM_CONFIG.ALLOW_COOKIES,
        enableXRay: RUM_CONFIG.ENABLE_XRAY
      }
    )
  })

  test("handles AwsRum initialization error", () => {
    // Mock console.error to prevent actual error logging
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Simulate AwsRum constructor throwing an error
    (AwsRum as jest.Mock).mockImplementation(() => {
      throw new Error("Initialization Error")
    })

    render(<AwsRumProvider><div>Test Child</div></AwsRumProvider>)

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "AWS RUM initialization error:",
      expect.any(Error)
    )

    // Restore console.error
    consoleErrorSpy.mockRestore()
  })

  test("provides null when AwsRum initialization fails", () => {
    // Simulate AwsRum constructor throwing an error
    (AwsRum as jest.Mock).mockImplementation(() => {
      throw new Error("Initialization Error")
    })

    const {getByTestId} = render(
      <AwsRumProvider>
        <TestComponent />
      </AwsRumProvider>
    )

    // Check that the test component receives null
    expect(getByTestId("rum-test")).toHaveTextContent("RUM Not Initialized")
  })

  test("renders children correctly", () => {
    const {getByText} = render(
      <AwsRumProvider>
        <div>Test Child Content</div>
      </AwsRumProvider>
    )

    expect(getByText("Test Child Content")).toBeInTheDocument()
  })
})
