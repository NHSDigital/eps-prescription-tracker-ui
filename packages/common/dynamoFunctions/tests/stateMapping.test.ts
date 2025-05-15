import {jest} from "@jest/globals"

import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {insertStateMapping, getStateMapping, deleteStateMapping} from "../src/stateMapping"

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

describe("insert stateMapping", () => {
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
    await insertStateMapping(
      mockDocumentClient,
      mockTableName,
      {
        State: "foo",
        CognitoState: "bar",
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
      insertStateMapping(
        mockDocumentClient,
        mockTableName,
        {
          State: "foo",
          CognitoState: "bar",
          ExpiryTime: 10
        },
        mockLogger as Logger
      )
    ).rejects.toThrow("Error inserting into stateMapping")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error inserting into stateMapping",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)

  })
})

describe("get stateMapping", () => {
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
    const result = await getStateMapping(
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
      getStateMapping(
        mockDocumentClient,
        mockTableName,
        mockUsername,
        mockLogger as Logger
      )
    ).rejects.toThrow("Error retrieving data from stateMapping")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error retrieving data from stateMapping",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })
})

describe("delete stateMapping", () => {
  let mockDocumentClient: jest.Mocked<DynamoDBDocumentClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentClient = {
      send: jest.fn()
    } as unknown as jest.Mocked<DynamoDBDocumentClient>
  })

  it("should insert into DynamoDB successfully", async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({"$metadata": {httpStatusCode: 200}} as never)

    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    await deleteStateMapping(
      mockDocumentClient,
      mockTableName,
      mockUsername,
      mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(DeleteCommand)
    )
  })

  it("should log and throw an error on failure", async () => {
    const mockError = new Error("DynamoDB error") as never

    mockDocumentClient.send.mockRejectedValueOnce(mockError)
    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    await expect(
      deleteStateMapping(
        mockDocumentClient,
        mockTableName,
        mockUsername,
        mockLogger as Logger
      )
    ).rejects.toThrow("Error deleting data from stateMapping")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error deleting data from stateMapping",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })
})
