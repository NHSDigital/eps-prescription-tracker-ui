import {jest} from "@jest/globals"

import {generateKeyPairSync} from "crypto"

import {mockAPIGatewayProxyEvent, mockContext, mockMergedResponse} from "./mockObjects"

const {privateKey} = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  }
})

// Define mock functions
const mockAuthenticateRequest = jest.fn()
const mockGetUsernameFromEvent = jest.fn()

// Mock the authFunctions module
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    authenticateRequest: mockAuthenticateRequest,
    getUsernameFromEvent: mockGetUsernameFromEvent
  }
})

interface PrescriptionResponse {
  statusCode: number;
  body: string;
  headers: { foo: string };
}
const mockProcessPrescriptionRequest = jest.fn<() => Promise<PrescriptionResponse>>()
jest.unstable_mockModule("../src/services/prescriptionService", () => {
  const processPrescriptionRequest = mockProcessPrescriptionRequest.mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify(mockMergedResponse),
    headers: {foo: "bar"}
  })

  return {
    processPrescriptionRequest
  }
})

const mockGetSecret = jest.fn()
jest.unstable_mockModule("@aws-lambda-powertools/parameters/secrets", () => {
  const getSecret = mockGetSecret.mockImplementation(async () => {
    return privateKey
  })

  return {
    getSecret
  }
})

// Import the handler after the mocks have been defined.
const {handler} = await import("../src/handler")

describe("Lambda Handler Tests", () => {
  // Create copies of the event and context for testing.
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  beforeEach(() => {
    // Reset mocks before each test.
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("Handler returns 200 if all the components return successes", async () => {
    mockGetUsernameFromEvent.mockReturnValue("test_user")
    mockAuthenticateRequest.mockImplementation(() => {
      return Promise.resolve({
        apigeeAccessToken: "apigee_access_token",
        roleId: "dummy_role",
        orgCode: "dummy_org"
      })
    })

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response.statusCode).toBe(200)

    const parsedBody = JSON.parse(response.body)
    expect(parsedBody).toStrictEqual(mockMergedResponse)
  })

  it("Returns an error if no orgCode returned", async () => {
    mockGetUsernameFromEvent.mockReturnValue("test_user")
    mockAuthenticateRequest.mockImplementation(() => {
      return Promise.resolve({
        apigeeAccessToken: "apigee_access_token",
        roleId: "dummy_role"
      })
    })

    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("Returns an error if no roleId returned", async () => {
    mockGetUsernameFromEvent.mockReturnValue("test_user")
    mockAuthenticateRequest.mockImplementation(() => {
      return Promise.resolve({
        apigeeAccessToken: "apigee_access_token",
        orgCode: "dummy_org"
      })
    })

    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("Throws error when JWT private key is missing or invalid", async () => {
    // Simulate getSecret returning a null or invalid value.
    mockGetSecret.mockImplementationOnce(async () => null)
    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("Returns system error response if processPrescriptionRequest throws an error", async () => {
    // Simulate an error in the prescription service.
    mockProcessPrescriptionRequest.mockRejectedValueOnce(new Error("Test error"))
    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("throws error when authentication fails", async () => {
    // Make the authenticateRequest mock throw an error for this test
    mockAuthenticateRequest.mockImplementationOnce(() => {
      throw new Error("Error in auth")
    })

    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })
})
