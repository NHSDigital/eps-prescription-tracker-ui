import {jest} from "@jest/globals"

import {
  DynamoDBDocumentClient,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {
  insertTokenMapping,
  updateTokenMapping,
  deleteTokenMapping,
  getTokenMapping,
  tryGetTokenMapping
} from "../src/tokenMapping"

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

describe("insert tokenMapping", () => {
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

    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    await insertTokenMapping(
      mockDocumentClient,
      mockTableName,
      {
        username: mockUsername,
        lastActivityTime: 0
      },
        mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(PutCommand)
    )
  })

  it("should log and throw an error on failure when inserting into table", async () => {
    const mockError = new Error("DynamoDB error") as never

    mockDocumentClient.send.mockRejectedValueOnce(mockError)
    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    await expect(
      insertTokenMapping(
        mockDocumentClient,
        mockTableName,
        {
          username: mockUsername,
          lastActivityTime: 0
        },
            mockLogger as Logger
      )
    ).rejects.toThrow(`Error inserting into table ${mockTableName}`)

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error inserting into table",
      {error: mockError, tableName: mockTableName}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)

  })
})

describe("update tokenMapping", () => {
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
        apigeeAccessToken: mockAccessToken,
        apigeeRefreshToken: mockRefreshToken,
        apigeeExpiresIn: mockExpiresIn,
        lastActivityTime: 0
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
    expect(calledAttributeValues?.[":apigeeExpiresIn"]
    ).toBeCloseTo(expectedExpiryTime, -2)
    expect(calledAttributeValues?.[":apigeeAccessToken"]).toBe(mockAccessToken)
    expect(calledAttributeValues?.[":apigeeRefreshToken"]).toBe(mockRefreshToken)
    expect(calledAttributeValues?.[":selectedRoleId"]).toBeUndefined()
    expect(calledAttributeValues?.[":userDetails"]).toBeUndefined()
    expect(calledAttributeValues?.[":rolesWithAccess"]).toBeUndefined()
    expect(calledAttributeValues?.[":rolesWithoutAccess"]).toBeUndefined()
  })

  it("should log and throw an error on failure when updating item in table", async () => {
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
          apigeeAccessToken: mockAccessToken,
          apigeeRefreshToken: mockRefreshToken,
          apigeeExpiresIn: mockExpiresIn,
          lastActivityTime: 0
        },
          mockLogger as Logger
      )
    ).rejects.toThrow("Error updating data in tokenMapping")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error updating data in tokenMapping",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })
})

describe("delete tokenMapping", () => {
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
    await deleteTokenMapping(
      mockDocumentClient,
      mockTableName,
      mockUsername,
      mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(DeleteCommand)
    )
  })

  it("should log and throw an error on failure when deleting item from table", async () => {
    const mockError = new Error("DynamoDB error") as never

    mockDocumentClient.send.mockRejectedValueOnce(mockError)
    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    await expect(
      deleteTokenMapping(
        mockDocumentClient,
        mockTableName,
        mockUsername,
        mockLogger as Logger
      )
    ).rejects.toThrow("Error deleting data from tokenMapping")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error deleting data from tokenMapping",
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })
})

describe("get tokenMapping", () => {
  let mockDocumentClient: jest.Mocked<DynamoDBDocumentClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentClient = {
      send: jest.fn()
    } as unknown as jest.Mocked<DynamoDBDocumentClient>
  })

  it("should get data from DynamoDB successfully", async () => {
    const mockItem = {
      username: "foo",
      cis2AccessToken: "bar"
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({"Item": mockItem} as never)

    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    const result = await getTokenMapping(
      mockDocumentClient,
      mockTableName,
      mockUsername,
      mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(GetCommand)
    )
    expect(result).toBe(mockItem)
  })

  it("should log and throw an error on failure when retrieving item from table", async () => {
    const mockError = new Error("DynamoDB error") as never

    mockDocumentClient.send.mockRejectedValueOnce(mockError)
    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    await expect(
      getTokenMapping(
        mockDocumentClient,
        mockTableName,
        mockUsername,
        mockLogger as Logger
      )
    ).rejects.toThrow(`Error retrieving data from ${mockTableName}`)

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Found no record for ${mockUsername} in ${mockTableName}`,
      {error: mockError}
    )
    expect(mockDocumentClient.send).toHaveBeenCalledTimes(1)
  })

  it("should return item when tryGetTokenMapping finds record", async () => {
    const mockItem = {
      username: "testUser",
      cis2AccessToken: "token123",
      lastActivityTime: 0
    }

    // Mock successful DynamoDB response
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({Item: mockItem} as never)

    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    const result = await getTokenMapping(
      mockDocumentClient,
      mockTableName,
      mockUsername,
      mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(GetCommand)
    )
    expect(result).toBe(mockItem)
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Item found for ${mockUsername} in ${mockTableName}`,
      {username: mockUsername, tableName: mockTableName, item: mockItem}
    )
  })

  it("should throw error when tryGetTokenMapping finds no record", async () => {
    // Mock DynamoDB response with no Item (undefined)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({} as never)

    const mockUsername = "testUser"
    const mockTableName = "mockTable"

    await expect(
      getTokenMapping(
        mockDocumentClient,
        mockTableName,
        mockUsername,
        mockLogger as Logger
      )
    ).rejects.toThrow(`Error retrieving data from ${mockTableName} for user: ${mockUsername}`)

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(GetCommand)
    )
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "No record found",
      {tableName: mockTableName, username: mockUsername, result: {}}
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error retrieving data from ${mockTableName} for user: ${mockUsername}`,
      {tableName: mockTableName, username: mockUsername}
    )
  })
})

describe("tryGetTokenMapping", () => {
  let mockDocumentClient: jest.Mocked<DynamoDBDocumentClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentClient = {
      send: jest.fn()
    } as unknown as jest.Mocked<DynamoDBDocumentClient>
  })

  it("should return item when found in DynamoDB", async () => {
    const mockItem = {
      username: "testUser",
      cis2AccessToken: "token123",
      lastActivityTime: 0
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({Item: mockItem} as never)

    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    const result = await tryGetTokenMapping(
      mockDocumentClient,
      mockTableName,
      mockUsername,
      mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(GetCommand)
    )
    expect(result).toBe(mockItem)
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Item found for ${mockUsername} in ${mockTableName}`,
      {username: mockUsername, tableName: mockTableName, item: mockItem}
    )
  })

  it("should return undefined when no item found in DynamoDB", async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockDocumentClient.send.mockResolvedValueOnce({} as never)

    const mockUsername = "testUser"
    const mockTableName = "mockTable"
    const result = await tryGetTokenMapping(
      mockDocumentClient,
      mockTableName,
      mockUsername,
      mockLogger as Logger
    )

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(GetCommand)
    )
    expect(result).toBeUndefined()
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "No record found",
      {tableName: mockTableName, username: mockUsername, result: {}}
    )
  })

  it("should log and throw error on DynamoDB failure", async () => {
    const mockError = new Error("DynamoDB error") as never
    mockDocumentClient.send.mockRejectedValueOnce(mockError)

    const mockUsername = "testUser"
    const mockTableName = "mockTable"

    await expect(
      tryGetTokenMapping(
        mockDocumentClient,
        mockTableName,
        mockUsername,
        mockLogger as Logger
      )
    ).rejects.toThrow(`Error retrieving data from ${mockTableName}`)

    expect(mockDocumentClient.send).toHaveBeenCalledWith(
      expect.any(GetCommand)
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Found no record for ${mockUsername} in ${mockTableName}`,
      {error: mockError}
    )
  })
})
