import {jest} from "@jest/globals"
import {updateApigeeAccessToken} from "../src/utils/dynamoUtils"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  UpdateCommand: jest.fn()
}))

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}

describe("dynamoUtils", () => {
  let mockDocumentClient: jest.Mocked<DynamoDBDocumentClient>
  const mockTableName = "mockTable"
  const mockUsername = "testUser"
  const mockAccessToken = "testToken"
  const mockExpiresIn = 3600

  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentClient = {
      send: jest.fn()
    } as unknown as jest.Mocked<DynamoDBDocumentClient>
  })

  const testUpdateApigeeAccessToken = async (
    isSuccessful: boolean,
    mockError?: Error
  ) => {
    if (isSuccessful) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      mockDocumentClient.send.mockResolvedValueOnce({} as never)
    } else {
      mockDocumentClient.send.mockRejectedValueOnce(mockError as never)
    }

    return updateApigeeAccessToken(
      mockDocumentClient,
      mockTableName,
      mockUsername,
      mockAccessToken,
      mockExpiresIn,
      mockLogger as Logger
    )
  }

  it("should update DynamoDB with correct details", async () => {
    await testUpdateApigeeAccessToken(true)

    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)

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
    const mockError = new Error("DynamoDB error")

    await expect(testUpdateApigeeAccessToken(false, mockError)).rejects.toThrow(
      "Failed to update access token in DynamoDB"
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to update access token in DynamoDB",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })
})
