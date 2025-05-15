/* eslint-disable @typescript-eslint/consistent-type-assertions */
import {jest} from "@jest/globals"

import axios from "axios"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"

jest.mock("axios")
jest.mock("jsonwebtoken")
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)
const getTokenMapping = jest.fn()
const updateTokenMapping = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    updateTokenMapping,
    getTokenMapping
  }
})

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

const {exchangeTokenForApigeeAccessToken,
  getExistingApigeeAccessToken,
  refreshApigeeAccessToken} = await import("../src/apigee")

describe("apigeeUtils", () => {
  const mockAxiosPost = jest.fn();
  (axios.post as unknown as jest.Mock) = mockAxiosPost

  beforeEach(() => {
    jest.clearAllMocks()
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

  describe("getExistingApigeeAccessToken", () => {
    it("should return null when no user record exists", async () => {

      const result = await getExistingApigeeAccessToken(
        documentClient,
        "mockTable",
        "testUser",
        mockLogger as Logger
      )

      expect(result).toBeNull()
    })

    it("should return null when no valid token exists", async () => {

      getTokenMapping.mockImplementationOnce(() => Promise.resolve( {
        username: "testUser"
      }))
      const result = await getExistingApigeeAccessToken(
        documentClient,
        "mockTable",
        "testUser",
        mockLogger as Logger
      )

      expect(result).toBeNull()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "No Apigee token found in user record",
        {username: "testUser"}
      )
    })

    it("should return valid token when it exists and is not expired", async () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiryTime = currentTime + 3600
      getTokenMapping.mockImplementationOnce(() => Promise.resolve( {
        username: "testUser",
        apigeeAccessToken: "valid-token",
        apigeeExpiresIn: expiryTime,
        apigeeIdToken: "id-token",
        apigeeRefreshToken: "refresh-token",
        selectedRoleId: "role-id"
      }))

      const result = await getExistingApigeeAccessToken(
        documentClient,
        "mockTable",
        "testUser",
        mockLogger as Logger
      )

      expect(result).toEqual({
        apigeeAccessToken: "valid-token",
        apigeeRefreshToken: "refresh-token",
        apigeeExpiresIn: expiryTime,
        roleId: "role-id"
      })
    })

  })

  describe("refreshApigeeAccessToken", () => {
    it("should successfully refresh token with client secret", async () => {
      mockAxiosPost.mockReturnValue(Promise.resolve({
        data: {
          access_token: "new-access-token",
          refresh_token_expires_in: 1738,
          refresh_token: "new-refresh-token",
          expires_in: 3600
        }
      }))

      const result = await refreshApigeeAccessToken(
        axios,
        "https://mock-endpoint",
        "old-refresh-token",
        "mock-api-key",
        "mock-api-secret",
        mockLogger as Logger
      )

      expect(result).toEqual({
        accessToken: "new-access-token",
        refreshTokenExpiresIn: 1738,
        refreshToken: "new-refresh-token",
        expiresIn: 3600
      })

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://mock-endpoint",
        expect.any(String),
        {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
      )
    })

    it("should successfully refresh token without client secret", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          access_token: "new-access-token",
          expires_in: 3600
        }
      } as never)

      const result = await refreshApigeeAccessToken(
        axios,
        "https://mock-endpoint",
        "old-refresh-token",
        "mock-api-key",
        "",
        mockLogger as Logger
      )

      expect(result).toEqual({
        accessToken: "new-access-token",
        expiresIn: 3600
      })
    })

    it("should throw error for invalid response", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {}
      } as never)

      await expect(
        refreshApigeeAccessToken(
          axios,
          "https://mock-endpoint",
          "old-refresh-token",
          "mock-api-key",
          "mock-api-secret",
          mockLogger as Logger
        )
      ).rejects.toThrow("Invalid response from Apigee token refresh endpoint")

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Invalid response from Apigee token refresh",
        expect.any(Object)
      )
    })
  })
})
