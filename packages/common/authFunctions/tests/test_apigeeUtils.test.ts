/* eslint-disable @typescript-eslint/consistent-type-assertions */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

import type {AxiosInstance} from "axios"
import {Logger} from "@aws-lambda-powertools/logger"
import {exchangeTokenForApigeeAccessToken, refreshApigeeAccessToken, buildApigeeHeaders} from "../src/apigee"

const mockLogger: Partial<Logger> = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn()
}

const mockAxiosPost = vi.fn()
const axiosInstance = {
  post: mockAxiosPost
} as unknown as AxiosInstance

describe("apigeeUtils", () => {
  beforeAll(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("test-uuid-in-uuid-format")
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("buildApigeeHeaders", () => {
    it("should return correct headers given a token and roleId", () => {
      const apigeeAccessToken = "sampleToken"
      const roleId = "sampleRole"
      const orgCode = "sampleOrgCode"
      const correlationId = "sampleCorrelationId"

      const expectedHeaders = {
        Authorization: `Bearer ${apigeeAccessToken}`,
        "nhsd-session-urid": roleId,
        "nhsd-organization-uuid": orgCode,
        "nhsd-identity-uuid": roleId,
        "nhsd-session-jobrole": roleId,
        "x-correlation-id": correlationId,
        "x-request-id": "test-uuid-in-uuid-format"
      }

      const headers = buildApigeeHeaders(apigeeAccessToken, roleId, orgCode, correlationId)
      expect(headers).toEqual(expectedHeaders)
    })
  })

  describe("exchangeTokenForApigeeAccessToken", () => {
    it("should successfully exchange token with Apigee", async () => {
      mockAxiosPost.mockResolvedValueOnce({data: {access_token: "testToken", expires_in: 3600}} as never)

      const result = await exchangeTokenForApigeeAccessToken(
        axiosInstance,
        "https://mock-endpoint",
        {param: "test"},
        mockLogger as Logger
      )

      expect(result).toEqual({accessToken: "testToken", expiresIn: 3600})
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "https://mock-endpoint",
        expect.any(String), // Request body as URL-encoded string
        {headers: {"Content-Type": "application/x-www-form-urlencoded"}, timeout: 2000}
      )
    })

    it("should throw an error for invalid response from Apigee", async () => {
      mockAxiosPost.mockResolvedValueOnce({data: {}} as never)
      await expect(
        exchangeTokenForApigeeAccessToken(
          axiosInstance,
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
          axiosInstance,
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
        axiosInstance,
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
        axiosInstance,
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
          axiosInstance,
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
