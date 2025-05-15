import {jest} from "@jest/globals"

import {DynamoDBDocumentClient, PutCommand, GetCommand} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {insertSessionState, getSessionState} from "../src/sessionState"

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

describe("insert sessionState", () => {
  let mockDocumentClient: jest.Mocked<DynamoDBDocumentClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentClient = {
      send: jest.fn()
    } as unknown as jest.Mocked<DynamoDBDocumentClient>
  })

  it("should insert into DynamoDB successfully", async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({} as never)

    const mockTableName = "mockTable"
    await insertSessionState(
      mockDocumentClient,
      mockTableName,
      {
        LocalCode: "foo",
        SessionState: "bar",
        ApigeeCode: "baz",
        ExpiryTime: 10
      },
      mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(PutCommand)
    )
  })

  it("should log and throw an error on failure", async () => {
    const mockError = new Error("DynamoDB error") as never

    mockDocumentClient.send.mockRejectedValueOnce(mockError)
    const mockTableName = "mockTable"
    await expect(
      insertSessionState(
        mockDocumentClient,
        mockTableName,
        {
          LocalCode: "foo",
          SessionState: "bar",
          ApigeeCode: "baz",
          ExpiryTime: 10
        },
        mockLogger as Logger
      )
    ).rejects.toThrow("Error inserting into sessionState")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error inserting into sessionState",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)

  })
})

describe("get sessionState", () => {
  let mockDocumentClient: jest.Mocked<DynamoDBDocumentClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentClient = {
      send: jest.fn()
    } as unknown as jest.Mocked<DynamoDBDocumentClient>
  })

  it.skip("should get data from DynamoDB successfully", async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({"Item": {httpStatusCode: 200}} as never)

    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    const result = await getSessionState(
      mockDocumentClient,
      mockTableName,
      mockUsername,
      mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(GetCommand)
    )
    expect(result).toBe(1)
  })

  it("should log and throw an error on failure", async () => {
    const mockError = new Error("DynamoDB error") as never

    mockDocumentClient.send.mockRejectedValueOnce(mockError)
    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    await expect(
      getSessionState(
        mockDocumentClient,
        mockTableName,
        mockUsername,
        mockLogger as Logger
      )
    ).rejects.toThrow("Error retrieving data from sessionState")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error retrieving data from sessionState",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })
})
