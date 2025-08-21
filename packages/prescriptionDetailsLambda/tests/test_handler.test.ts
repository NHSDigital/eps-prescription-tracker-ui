import {jest} from "@jest/globals"

import {mockAPIGatewayProxyEvent, mockContext, mockMergedResponse} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"
import {AuthenticateRequestOptions} from "@cpt-ui-common/authFunctions"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"

const mockProcessPrescriptionRequest = jest.fn(() => Promise.resolve(mockMergedResponse))
jest.unstable_mockModule("../src/services/prescriptionService", () => {
  return {
    processPrescriptionRequest: mockProcessPrescriptionRequest
  }
})

// Needed to avoid issues with ESM imports in jest
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => ({
  authParametersFromEnv: jest.fn(),
  buildApigeeHeaders: jest.fn(),
  authenticationMiddleware: () => ({before: () => {}})
}))

// Import the handler after the mocks have been defined.
const {newHandler} = await import("../src/handler")

describe("Lambda Handler Tests", () => {
  // Create copy of the event for testing.
  let logger = new Logger({serviceName: "prescriptionDetailsLambda"})
  logger.warn = jest.fn()
  logger.error = jest.fn()
  logger.info = jest.fn()
  const handler = newHandler({
    errorResponseBody: {message: "A system error has occurred"},
    logger: logger,
    documentClient: {} as unknown as DynamoDBDocumentClient,
    apigeePrescriptionsEndpoint: "https://dummy.endpoint",
    authenticationParameters: {} as unknown as AuthenticateRequestOptions,
    axiosInstance: {} as unknown as AxiosInstance
  })

  let event = {...mockAPIGatewayProxyEvent}

  beforeEach(() => {
    // Reset mocks before each test.
    jest.resetModules()
    jest.clearAllMocks()
    event.pathParameters = {prescriptionId: "dummy_prescription_id"}
    event.requestContext.authorizer = {roleId: "dummy_role", orgCode: "dummy_org"}
  })

  it("Handler returns 200 if all the components return successes", async () => {
    const response = await handler(event, mockContext)

    expect(response).toBeDefined()
    expect(response.statusCode).toBe(200)

    const parsedBody = JSON.parse(response.body)
    expect(parsedBody).toStrictEqual(mockMergedResponse)
  })

  it("Returns an error if no orgCode returned", async () => {
    event.requestContext.authorizer = {roleId: "dummy_role"}
    const response = await handler(event, mockContext)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("Returns an error if no roleId returned", async () => {
    event.requestContext.authorizer = {orgCode: "dummy_org"}
    const response = await handler(event, mockContext)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("should return 400 if prescriptionId is missing", async () => {
    event.pathParameters = {prescriptionId: null}
    const result = await handler(event, mockContext)

    expect(result.statusCode).toEqual(400)
    const body = JSON.parse(result.body)
    expect(body).toEqual({
      message: "Missing prescription ID in request",
      prescriptionId: null
    })
    expect(logger.warn).toHaveBeenCalledWith("No prescription ID provided in request", {event})
  })

  it("Returns system error response if processPrescriptionRequest throws an error", async () => {
    // Simulate an error in the prescription service.
    mockProcessPrescriptionRequest.mockRejectedValueOnce(new Error("Test error"))
    const response = await handler(event, mockContext)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })
})
