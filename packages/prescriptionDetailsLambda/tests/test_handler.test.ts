import {jest} from "@jest/globals"

import {mockAPIGatewayProxyEvent, mockContext, mockMergedResponse} from "./mockObjects"

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

// Import the handler after the mocks have been defined.
const {handler} = await import("../src/handler")

describe("Lambda Handler Tests", () => {
  // Create copies of the event and context for testing.
  let event = {...mockAPIGatewayProxyEvent}
  event.requestContext.authorizer = {
    apigeeAccessToken: "apigee_access_token",
    roleId: "dummy_role",
    orgCode: "dummy_org"
  }
  let context = {...mockContext}

  beforeEach(() => {
    // Reset mocks before each test.
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("Handler returns 200 if all the components return successes", async () => {
    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response.statusCode).toBe(200)

    const parsedBody = JSON.parse(response.body)
    expect(parsedBody).toStrictEqual(mockMergedResponse)
  })

  it("Returns an error if no orgCode returned", async () => {
    event.requestContext.authorizer = {
      apigeeAccessToken: "apigee_access_token",
      roleId: "dummy_role"
    }

    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("Returns an error if no roleId returned", async () => {
    event.requestContext.authorizer = {
      apigeeAccessToken: "apigee_access_token",
      orgCode: "dummy_org"
    }

    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("Returns system error response if processPrescriptionRequest throws an error", async () => {
    // Simulate an error in the prescription service.
    mockProcessPrescriptionRequest.mockRejectedValueOnce(new Error("Test error"))
    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })
})
