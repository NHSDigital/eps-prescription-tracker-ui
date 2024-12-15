import {jest} from "@jest/globals"
import {getUsernameFromEvent, fetchCIS2TokensFromDynamoDB, fetchCIS2Tokens} from "../src/utils/cis2TokenUtils"
import {APIGatewayProxyEvent} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import {mockClient} from "aws-sdk-client-mock"

const dynamoDbMock = mockClient(DynamoDBDocumentClient)

describe("cis2TokenUtils", () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  } as unknown as Logger

  beforeEach(() => {
    jest.clearAllMocks()
    dynamoDbMock.reset()
  })

  describe("getUsernameFromEvent", () => {
    it("should extract the username from event", () => {
      const mockEvent = {
        requestContext: {
          authorizer: {
            claims: {
              "cognito:username": "testUser"
            }
          }
        }
      } as unknown as APIGatewayProxyEvent

      const username = getUsernameFromEvent(mockEvent)
      expect(username).toBe("testUser")
    })

    it("should throw an error if username is missing in claims", () => {
      const invalidEvent = {
        requestContext: {
          authorizer: {
            claims: {}
          }
        }
      } as unknown as APIGatewayProxyEvent

      expect(() => getUsernameFromEvent(invalidEvent)).toThrow(
        "Unable to extract username from Cognito claims"
      )
    })
  })

  describe("fetchCIS2TokensFromDynamoDB", () => {
    const username = "testUser"
    const tableName = "TokenMappingTable"

    it("should fetch CIS2 tokens successfully from DynamoDB", async () => {
      dynamoDbMock.on(GetCommand).resolves({
        Item: {CIS2_accessToken: "mockAccessToken", CIS2_idToken: "mockIdToken"}
      })

      const result = await fetchCIS2TokensFromDynamoDB(
        username,
        tableName,
        dynamoDbMock as unknown as DynamoDBDocumentClient,
        mockLogger
      )

      expect(result).toEqual({cis2AccessToken: "mockAccessToken", cis2IdToken: "mockIdToken"})
      expect(mockLogger.info).toHaveBeenCalledWith("Fetching CIS2 tokens from DynamoDB", {
        username
      })
      expect(mockLogger.debug).toHaveBeenCalledWith("DynamoDB response", expect.any(Object))
    })

    it("should throw an error if tokens are not found in DynamoDB", async () => {
      dynamoDbMock.on(GetCommand).resolves({})

      await expect(
        fetchCIS2TokensFromDynamoDB(
          username,
          tableName,
          dynamoDbMock as unknown as DynamoDBDocumentClient,
          mockLogger
        )
      ).rejects.toThrow("Internal server error while accessing DynamoDB")

      expect(mockLogger.error).toHaveBeenCalledWith("CIS2 tokens not found in DynamoDB", {
        username
      })
    })

    it("should throw an error if DynamoDB call fails", async () => {
      dynamoDbMock.on(GetCommand).rejects(new Error("DynamoDB error"))

      await expect(
        fetchCIS2TokensFromDynamoDB(
          username,
          tableName,
          dynamoDbMock as unknown as DynamoDBDocumentClient,
          mockLogger
        )
      ).rejects.toThrow("Internal server error while accessing DynamoDB")

      expect(mockLogger.error).toHaveBeenCalledWith("Error fetching CIS2 tokens from DynamoDB", {
        username,
        error: expect.any(Error)
      })
    })
  })

  describe("fetchCIS2Tokens", () => {
    const mockEvent = {
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": "testUser"
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    beforeEach(() => {
      process.env["TokenMappingTableName"] = "TokenMappingTable"
    })

    afterEach(() => {
      delete process.env["TokenMappingTableName"]
    })

    it("should fetch CIS2 tokens successfully using event and environment variables", async () => {
      dynamoDbMock.on(GetCommand).resolves({
        Item: {CIS2_accessToken: "mockAccessToken", CIS2_idToken: "mockIdToken"}
      })

      const result = await fetchCIS2Tokens(
        mockEvent,
        dynamoDbMock as unknown as DynamoDBDocumentClient,
        mockLogger
      )

      expect(result).toEqual({cis2AccessToken: "mockAccessToken", cis2IdToken: "mockIdToken"})
    })

    it("should throw an error if TokenMappingTableName is not set in environment variables", async () => {
      delete process.env["TokenMappingTableName"]

      await expect(
        fetchCIS2Tokens(
          mockEvent,
          dynamoDbMock as unknown as DynamoDBDocumentClient,
          mockLogger
        )
      ).rejects.toThrow("Token mapping table name is not set in environment variables")
    })

    it("should throw an error if username is missing in event", async () => {
      const invalidEvent = {
        requestContext: {
          authorizer: {
            claims: {}
          }
        }
      } as unknown as APIGatewayProxyEvent

      await expect(
        fetchCIS2Tokens(
          invalidEvent,
          dynamoDbMock as unknown as DynamoDBDocumentClient,
          mockLogger
        )
      ).rejects.toThrow("Unable to extract username from Cognito claims")
    })
  })
})
