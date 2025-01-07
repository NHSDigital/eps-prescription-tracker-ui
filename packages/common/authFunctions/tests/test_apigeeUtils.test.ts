/* eslint-disable @typescript-eslint/consistent-type-assertions */
import {jest} from "@jest/globals"
import {exchangeTokenForApigeeAccessToken, updateApigeeAccessToken} from "../src/apigee"
import axios from "axios"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"

jest.mock("axios")

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  UpdateCommand: jest.fn()
}))

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

describe("apigeeUtils", () => {
  const mockAxiosPost = jest.fn();
  (axios.post as unknown as jest.Mock) = mockAxiosPost

  let mockDocumentClient: jest.Mocked<DynamoDBDocumentClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentClient = {
      send: jest.fn()
    } as unknown as jest.Mocked<DynamoDBDocumentClient>
  })

  describe("exchangeTokenForApigeeAccessToken", () => {
    it("should successfully exchange token with Apigee", async () => {
      mockAxiosPost.mockResolvedValueOnce({data: {access_token: "testToken", expires_in: 3600}} as never)

      const result = await exchangeTokenForApigeeAccessToken(
        axios,
        "https://mock-endpoint",
        {param: "test"},
        mockLogger as Logger
      )

      expect(result).toEqual({accessToken: "testToken", expiresIn: 3600})
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://mock-endpoint",
        expect.any(String), // Request body as URL-encoded string
        {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
      )
    })

    it("should throw an error for invalid response from Apigee", async () => {
      mockAxiosPost.mockResolvedValueOnce({data: {}} as never)
      await expect(
        exchangeTokenForApigeeAccessToken(
          axios,
          "https://mock-endpoint",
          {param: "test"},
          mockLogger as Logger
        )
      ).rejects.toThrow("Error during Apigee token exchange")

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Invalid response from Apigee token endpoint",
        {response: {}}
      )
    })

    it("should handle Axios errors gracefully", async () => {
      mockAxiosPost.mockRejectedValueOnce(new Error("Axios error") as never)

      await expect(
        exchangeTokenForApigeeAccessToken(
          axios,
          "https://mock-endpoint",
          {param: "test"},
          mockLogger as Logger
        )
      ).rejects.toThrow("Error during Apigee token exchange")

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error during Apigee token exchange",
        {error: new Error("Axios error")}
      )
    })
  })

  describe("updateApigeeAccessToken", () => {
    it("should update DynamoDB successfully", async () => {
      mockDocumentClient.send.mockResolvedValueOnce({} as never)

      const mockTableName = "mockTable"
      const mockUsername = "testUser"
      const mockAccessToken = "testToken"
      const mockExpiresIn = 3600

      await updateApigeeAccessToken(
        mockDocumentClient,
        mockTableName,
        mockUsername,
        mockAccessToken,
        mockExpiresIn,
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
      const mockExpiresIn = 3600

      await expect(
        updateApigeeAccessToken(
          mockDocumentClient,
          mockTableName,
          mockUsername,
          mockAccessToken,
          mockExpiresIn,
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
})
