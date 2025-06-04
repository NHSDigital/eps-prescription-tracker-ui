import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"
import {APIGatewayProxyEvent} from "aws-lambda"
import {mockPatientSummary, mockLogger} from "@cpt-ui-common/testing"
import {lambdaHandler, HandlerParameters, INTERNAL_ERROR_RESPONSE_BODY} from "../src/handler"

import * as pds from "@cpt-ui-common/pdsClient"
const patientSearchOutcomeType = pds.patientSearch.OutcomeType
type patientSearchOutcome = pds.patientSearch.Outcome
const mockPdsClient = () => {
  return {
    with_access_token: jest.fn().mockReturnThis(),
    with_role_id: jest.fn().mockReturnThis(),
    with_org_code: jest.fn().mockReturnThis(),
    with_correlation_id: jest.fn().mockReturnThis(),
    patientSearch: jest.fn()
  } as unknown as pds.Client
}

describe("lambda handler unit tests", () => {
  let handlerParams: HandlerParameters
  let mockEvent: APIGatewayProxyEvent

  beforeEach(() => {
    mockEvent = {
      queryStringParameters: {
        familyName: "Doe",
        givenName: "John",
        dateOfBirth: "1990-01-01",
        postcode: "12345"
      },
      headers: {}
    } as unknown as APIGatewayProxyEvent

    handlerParams = {
      logger: mockLogger(),
      pdsClient: mockPdsClient(),
      usernameExtractor: () => "test-username",
      authenticationFunction: async () => {
        return {apigeeAccessToken: "test-access-token", roleId: "test-role-id", orgCode: "test-org-code"}
      }
    }
  })

  it("should return an error if username cannot be extracted from event", async () => {
    handlerParams.usernameExtractor = () => {
      throw new Error("Username not found")
    }

    const response = await lambdaHandler(mockEvent, handlerParams)

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toEqual({
      message: "Username not found in event"
    })
  })

  it("should return an error if authentication fails", async () => {
    handlerParams.authenticationFunction = () => {
      throw new Error("Authentication failed")
    }

    const response = await lambdaHandler(mockEvent, handlerParams)

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body)).toEqual({
      message: "Authentication failed"
    })
  })

  it("should return an error if no Apigee access token is found", async () => {
    handlerParams.authenticationFunction = async () => {
      return {apigeeAccessToken: "", roleId: "test-role-id", orgCode: "test-org-code"}
    }

    const response = await lambdaHandler(mockEvent, handlerParams)

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.body)).toEqual({
      message: "Authentication failed"
    })
  })

  it("should return an error if query parameters are missing", async () => {
    mockEvent.queryStringParameters = {}

    const response = await lambdaHandler(mockEvent, handlerParams)

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toEqual({
      message: "Missing query parameters",
      error: "familyName, dateOfBirth, postcode"
    })
  })

  describe("Handling patient search outcomes", () => {
    it("should return patients on successful search", async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      handlerParams.pdsClient.patientSearch = async () => ({
        type: patientSearchOutcomeType.SUCCESS,
        patients: [
          mockPatientSummary.patient_1
        ]
      } as patientSearchOutcome)

      const response = await lambdaHandler(mockEvent, handlerParams)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.body)).toEqual([mockPatientSummary.patient_1])

      expect(handlerParams.logger.info).toHaveBeenCalledWith("Search completed", expect.objectContaining({}))
    })

    it("should return an error for invalid parameters", async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      handlerParams.pdsClient.patientSearch = async () => ({
        type: patientSearchOutcomeType.INVALID_PARAMETERS,
        validationErrors: [{name: "familyName", error: "Name can be at most 35 characters"}]
      } as patientSearchOutcome)

      const response = await lambdaHandler(mockEvent, handlerParams)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({
        errors: [{
          error: "Name can be at most 35 characters",
          name: "familyName"
        }]
      })

      expect(handlerParams.logger.info).toHaveBeenCalledWith("Invalid parameters", expect.objectContaining({}))
    })

    it("should return an error for too many matches", async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      handlerParams.pdsClient.patientSearch = async () => ({
        type: patientSearchOutcomeType.TOO_MANY_MATCHES
      } as patientSearchOutcome)

      const response = await lambdaHandler(mockEvent, handlerParams)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({
        message: "Too many matches"
      })

      expect(handlerParams.logger.info).toHaveBeenCalledWith("Too many matches", expect.objectContaining({}))
    })

    it("should return an error for Axios errors", async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      handlerParams.pdsClient.patientSearch = async () => ({
        type: patientSearchOutcomeType.AXIOS_ERROR,
        error: new Error("Some error")
      } as patientSearchOutcome)

      const response = await lambdaHandler(mockEvent, handlerParams)

      expect(response.statusCode).toBe(500)
      expect(JSON.parse(response.body)).toEqual(INTERNAL_ERROR_RESPONSE_BODY)

      expect(handlerParams.logger.error).toHaveBeenCalledWith("Axios error", expect.objectContaining({}))
    })

    it("should return an error for unsupported PDS responses", async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      handlerParams.pdsClient.patientSearch = async () => ({
        type: patientSearchOutcomeType.PDS_ERROR,
        response: {status: 500, statusText: "Internal Server Error"}
      } as patientSearchOutcome)

      const response = await lambdaHandler(mockEvent, handlerParams)

      expect(response.statusCode).toBe(500)
      expect(JSON.parse(response.body)).toEqual(INTERNAL_ERROR_RESPONSE_BODY)

      expect(handlerParams.logger.error).toHaveBeenCalledWith("Unsupported PDS response", expect.objectContaining({}))
    })

    it("should return an error for response parse errors", async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      handlerParams.pdsClient.patientSearch = async () => ({
        type: patientSearchOutcomeType.PARSE_ERROR,
        response: {status: 200, statusText: "OK"},
        validationErrors: [{message: "Invalid response format"}]
      } as patientSearchOutcome)

      const response = await lambdaHandler(mockEvent, handlerParams)

      expect(response.statusCode).toBe(500)
      expect(JSON.parse(response.body)).toEqual(INTERNAL_ERROR_RESPONSE_BODY)

      expect(handlerParams.logger.error).toHaveBeenCalledWith("Response parse error", expect.objectContaining({}))
    })
  })
})
