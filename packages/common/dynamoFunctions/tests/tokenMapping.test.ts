import {jest} from "@jest/globals"

import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {updateApigeeAccessToken} from "../src/tokenMapping"

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

describe("updateApigeeAccessToken", () => {
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

    await updateApigeeAccessToken(
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

    if (calledCommand.input && "ExpressionAttributeValues" in calledCommand.input) {
      expect(
        (calledCommand.input as UpdateCommand["input"]).ExpressionAttributeValues?.[":apigeeExpiresIn"]
      ).toBeCloseTo(expectedExpiryTime, -2)
    } else {
      throw new Error("Called command input is not an UpdateCommand input")
    }
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
      updateApigeeAccessToken(
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
    ).rejects.toThrow("Failed to update Apigee access token in DynamoDB")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to update Apigee access token in DynamoDB",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })
})
