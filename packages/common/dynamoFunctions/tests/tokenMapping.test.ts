import {jest} from "@jest/globals"

import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {updateTokenMapping} from "../src/tokenMapping"

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

describe("tokenMappingTable", () => {
  let mockDocumentClient: jest.Mocked<DynamoDBDocumentClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentClient = {
      send: jest.fn()
    } as unknown as jest.Mocked<DynamoDBDocumentClient>
  })

  it("should update DynamoDB successfully", async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({} as never)

    const mockTableName = "mockTable"
    const mockUsername = "testUser"
    const mockAccessToken = "testToken"
    const mockRefreshToken = "testRefreshToken"
    const mockExpiresIn = 3600

    await updateTokenMapping(
      mockDocumentClient,
      mockTableName,
      {
        username: mockUsername,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: mockExpiresIn
      },
        mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(UpdateCommand)
    )

    const calledCommand = mockDocumentClient.send.mock.calls[0][0] as UpdateCommand
    const expectedExpiryTime = Math.floor(Date.now() / 1000) + mockExpiresIn

    expect(calledCommand.input).toBeDefined()
    const calledAttributeValues = (calledCommand.input as UpdateCommand["input"]).ExpressionAttributeValues
    expect(calledAttributeValues[":apigeeExpiresIn"]
    ).toBeCloseTo(expectedExpiryTime, -2)
    expect(calledAttributeValues[":apigeeAccessToken"]).toBe(mockAccessToken)
    expect(calledAttributeValues[":apigeeRefreshToken"]).toBe(mockRefreshToken)
    expect(calledAttributeValues[":selectedRoleId"]).toBeUndefined()
    expect(calledAttributeValues[":userDetails"]).toBeUndefined()
    expect(calledAttributeValues[":rolesWithAccess"]).toBeUndefined()
    expect(calledAttributeValues[":rolesWithoutAccess"]).toBeUndefined()
  })

  it("should log and throw an error on failure", async () => {
    const mockError = new Error("DynamoDB error") as never

    mockDocumentClient.send.mockRejectedValueOnce(mockError)

    const mockTableName = "mockTable"
    const mockUsername = "testUser"
    const mockAccessToken = "testToken"
    const mockRefreshToken = "testRefreshToken"
    const mockExpiresIn = 3600

    await expect(
      updateTokenMapping(
        mockDocumentClient,
        mockTableName,
        {
          username: mockUsername,
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
          expiresIn: mockExpiresIn
        },
          mockLogger as Logger
      )
    ).rejects.toThrow("Failed to update TokenMapping table in DynamoDB")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to update TokenMapping table in DynamoDB",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })
})
