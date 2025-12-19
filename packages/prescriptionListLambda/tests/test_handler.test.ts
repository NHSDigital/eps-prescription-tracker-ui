/* eslint-disable no-console */
import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"
import nock from "nock"

import {mockPdsPatient, mockPrescriptionBundle} from "./mockObjects"
import {PatientAddressUse, PatientNameUse} from "@cpt-ui-common/common-types"

const apigeePrescriptionsEndpoint = process.env.apigeePrescriptionsEndpoint as string ?? ""
const apigeePersonalDemographicsEndpoint = process.env.apigeePersonalDemographicsEndpoint as string ?? ""

// Needed to avoid issues with ESM imports in jest
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => ({
  authParametersFromEnv: jest.fn(),
  authenticationMiddleware: () => ({before: () => {}})
}))

// Import the handler after all mocks are set up
const {handler} = await import("../src/handler")

// redefining readonly property of the performance object
const dummyContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: "$LATEST",
  functionName: "foo-bar-function",
  memoryLimitInMB: "128",
  logGroupName: "/aws/lambda/foo-bar-function-123456abcdef",
  logStreamName: "2021/03/09/[$LATEST]abcdef123456abcdef123456abcdef123456",
  invokedFunctionArn: "arn:aws:lambda:eu-west-1:123456789012:function:foo-bar-function",
  awsRequestId: "c6af9ac6-7b61-11e6-9a41-93e812345678",
  requestId: "foo",
  getRemainingTimeInMillis: () => 1234,
  done: () => console.log("Done!"),
  fail: () => console.log("Failed!"),
  succeed: () => console.log("Succeeded!")
}

describe("handler tests with cis2 auth", () => {

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    // Mock the Patient endpoint with patient data
    nock(apigeePersonalDemographicsEndpoint)
      .get("/Patient/9000000009")
      .query(true)
      .reply(200, mockPdsPatient)

    // Mock the prescriptions endpoint with prescription data
    nock(apigeePrescriptionsEndpoint)
      .get("/RequestGroup")
      .query({
        nhsNumber: "9000000009"
      })
      .reply(200, mockPrescriptionBundle)

    nock(apigeePrescriptionsEndpoint)
      .get("/RequestGroup")
      .query({
        prescriptionId: "01ABC123"
      })
      .reply(200, mockPrescriptionBundle)

    // Query for prescription not found
    nock(apigeePrescriptionsEndpoint)
      .get("/RequestGroup")
      .query({
        prescriptionId: "123-ABC"
      })
      .reply(200, {})
  })

  it("responds with success on nhs number flow", async () => {
    const event = {
      queryStringParameters: {
        nhsNumber: "9000000009"
      },
      requestContext: {
        authorizer: {
          apigeeAccessToken: "apigee_access_token",
          roleId: "dummy_role",
          orgCode: "dummy_org"
        }
      },
      headers: {}
    }

    const response = await handler(event, dummyContext)
    const responseBody = JSON.parse(response.body)

    expect(response).toMatchObject({
      statusCode: 200
    })

    expect(responseBody).toEqual({
      currentPrescriptions: [{
        issueDate: "2023-01-01",
        itemsPendingCancellation: false,
        nhsNumber: "9999999999",
        prescriptionId: "01ABC123",
        prescriptionPendingCancellation: false,
        prescriptionTreatmentType: "0001",
        statusCode: "0001",
        isDeleted: false
      }],
      futurePrescriptions: [],
      pastPrescriptions: [],
      patient: {
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName: ["Jane"],
        nameUse: PatientNameUse.USUAL,
        address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
        postcode: "LS1 6AE",
        addressUse: PatientAddressUse.TEMP
      },
      patientFallback: false
    })
  })

  it("responds with success on prescription ID flow", async () => {
    const event = {
      queryStringParameters: {
        prescriptionId: "01ABC123"
      },
      requestContext: {
        authorizer: {
          apigeeAccessToken: "apigee_access_token",
          roleId: "dummy_role",
          orgCode: "dummy_org"
        }
      },
      headers: {}
    }

    const response = await handler(event, dummyContext)
    const responseBody = JSON.parse(response.body)

    expect(response).toMatchObject({
      statusCode: 200
    })

    expect(responseBody).toEqual({
      currentPrescriptions: [{
        isDeleted: false,
        issueDate: "2023-01-01",
        itemsPendingCancellation: false,
        nhsNumber: "9999999999",
        prescriptionId: "01ABC123",
        prescriptionPendingCancellation: false,
        prescriptionTreatmentType: "0001",
        statusCode: "0001"
      }],
      futurePrescriptions: [],
      pastPrescriptions: [],
      patient: {
        nhsNumber: "9999999999"
      },
      patientFallback: true
    })
  })

  it("Returns a 404 if prescription is not found", async () => {
    const event = {
      queryStringParameters: {
        prescriptionId: "123-ABC"
      },
      requestContext: {
        authorizer: {
          apigeeAccessToken: "apigee_access_token",
          roleId: "dummy_role",
          orgCode: "dummy_org"
        }
      },
      headers: {}
    }

    const response = await handler(event, dummyContext)
    const responseBody = JSON.parse(response.body)

    expect(response).toMatchObject({
      statusCode: 404
    })

    expect(responseBody).toMatchObject({
      message: "Prescription not found"
    })
  })

  it("throw error when no roleId returned", async () => {
    const response = await handler({
      queryStringParameters: {
        nhsNumber: "9999999999"
      },
      requestContext: {
        authorizer: {
          apigeeAccessToken: "apigee_access_token",
          orgCode: "dummy_org"
        }
      },
      headers: {}
    }, dummyContext)

    // Update the assertion to match the actual response format
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
  })

  it("throw error when no orgCode returned", async () => {
    const response = await handler({
      queryStringParameters: {
        nhsNumber: "9999999999"
      },
      requestContext: {
        authorizer: {
          apigeeAccessToken: "apigee_access_token",
          roleId: "dummy_role"
        }
      },
      headers: {}
    }, dummyContext)

    // Update the assertion to match the actual response format
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
  })

})
