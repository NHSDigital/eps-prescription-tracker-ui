import {jest} from "@jest/globals"

import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"

const mockGetUsernameFromEvent = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Mock_JoeBloggs"
  })

  return {
    getUsernameFromEvent
  }
})

// This mock will be used for the documentClient.send() call
const sendMock = jest.fn()

// Mock the DynamoDB client constructor (if needed)
jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn()
}))

// Mock the lib-dynamodb module so that DeleteCommand and DynamoDBDocumentClient are replaced.
const deleteCommandMock = jest.fn()
jest.mock("@aws-sdk/lib-dynamodb", () => {
  return {
    DeleteCommand: deleteCommandMock,
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: sendMock
      }))
    }
  }
})

const {handler} = await import("@/handler")

describe("Lambda Handler", () => {
  beforeEach(async () => {
    jest.clearAllMocks()
  })

  it("should return 200 and success message on successful deletion", async () => {
    sendMock.mockImplementationOnce(() => Promise.resolve({$metadata: {httpStatusCode: 200}}))

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)

    console.log(response)
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("CIS2 logout completed")

    // Verify that DeleteCommand was called with the expected parameters
    expect(deleteCommandMock).toHaveBeenCalledWith({
      TableName: process.env.TokenMappingTableName,
      Key: {username: mockAPIGatewayProxyEvent.requestContext.authorizer.claims["cognito:username"]}
    })

    expect(sendMock).toHaveBeenCalled()
  })

  it("should return error message if deletion is unsuccessful", async () => {
    sendMock.mockImplementationOnce(() => Promise.resolve({$metadata: {httpStatusCode: 500}}))

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)
    console.log(response)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
  })

  it("should throw an error when a mock user is used while mock mode is disabled", async () => {
    process.env.MOCK_MODE_ENABLED = "false"

    const {handler} = await import("@/handler")

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    // don't forget to set this back!
    process.env.MOCK_MODE_ENABLED = "true"
  })
})
