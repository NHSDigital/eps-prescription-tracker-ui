/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {AxiosInstance} from "axios"
import {authenticationConcurrentAwareMiddleware} from "../src/authenticationConcurrentAwareMiddleware"

const {
  mockGetUsernameFromEvent,
  mockGetSessionIdFromEvent,
  mockAuthenticateRequest,
  mockTryGetTokenMapping
} = vi.hoisted(() => ({
  mockGetUsernameFromEvent: vi.fn(),
  mockGetSessionIdFromEvent: vi.fn(),
  mockAuthenticateRequest: vi.fn(),
  mockTryGetTokenMapping: vi.fn()
}))

vi.mock("../src/event", () => ({
  getUsernameFromEvent: mockGetUsernameFromEvent,
  getSessionIdFromEvent: mockGetSessionIdFromEvent
}))

vi.mock("../src/authenticateRequest", () => ({
  authenticateRequest: mockAuthenticateRequest
}))

vi.mock("@cpt-ui-common/dynamoFunctions", () => ({
  tryGetTokenMapping: mockTryGetTokenMapping
}))

describe("authenticationConcurrentAwareMiddleware", () => {
  let logger: Logger
  let ddbClient: DynamoDBDocumentClient
  let axiosInstance: AxiosInstance
  let authOptions: any
  let mockEvent: any
  let mockRequest: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset all mock implementations and return values
    mockGetUsernameFromEvent.mockReset()
    mockGetSessionIdFromEvent.mockReset()
    mockAuthenticateRequest.mockReset()
    mockTryGetTokenMapping.mockReset()

    logger = new Logger({serviceName: "test"})
    logger.info = vi.fn()
    logger.debug = vi.fn()
    logger.error = vi.fn()

    const dynamoClient = new DynamoDBClient({})
    ddbClient = DynamoDBDocumentClient.from(dynamoClient)

    axiosInstance = {
      post: vi.fn(),
      get: vi.fn()
    } as unknown as AxiosInstance

    authOptions = {
      tokenMappingTableName: "test-token-table",
      sessionManagementTableName: "test-session-table",
      jwtPrivateKeyArn: "arn:aws:secretsmanager:region:account:secret:jwt-key",
      apigeeApiKey: "test-api-key",
      apigeeApiSecret: "test-api-secret",
      jwtKid: "test-kid",
      apigeeCis2TokenEndpoint: "https://test-endpoint",
      apigeeMockTokenEndpoint: "https://mock-endpoint",
      cloudfrontDomain: "test-domain.com"
    }

    mockEvent = {
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": "test-user",
            "custom:session_id": "test-session-id"
          }
        }
      },
      headers: {}
    }

    mockRequest = {
      event: mockEvent
    }
  })

  describe("concurrent session authentication flow", () => {
    it("should authenticate via session management table when session ID matches", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-session-access-token",
        refreshToken: "test-session-refresh-token",
        expiresAt: Date.now() + 3600000
      }
      const tokenMappingItem = {
        username: username,
        sessionId: "different-session-id", // Different session ID
        accessToken: "test-token-access-token",
        refreshToken: "test-token-refresh-token",
        expiresAt: Date.now() + 3600000
      }
      const authResult = {
        username: username,
        apigeeAccessToken: "test-apigee-token",
        roleId: "test-role"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem) // session management table
        .mockResolvedValueOnce(tokenMappingItem) // token mapping table
      mockAuthenticateRequest.mockResolvedValue(authResult)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      await middleware.before(mockRequest)

      // Assert
      expect(mockTryGetTokenMapping).toHaveBeenCalledTimes(2)
      expect(mockTryGetTokenMapping).toHaveBeenNthCalledWith(1,
        ddbClient,
        authOptions.sessionManagementTableName,
        username,
        logger
      )
      expect(mockTryGetTokenMapping).toHaveBeenNthCalledWith(2,
        ddbClient,
        authOptions.tokenMappingTableName,
        username,
        logger
      )
      expect(mockAuthenticateRequest).toHaveBeenCalledWith(
        username,
        {
          axiosInstance,
          ddbClient,
          logger,
          authOptions
        },
        sessionManagementItem,
        authOptions.sessionManagementTableName,
        false
      )
      expect(mockEvent.requestContext.authorizer).toEqual({
        ...authResult,
        sessionId: sessionId,
        isConcurrentSession: true
      })
      expect(mockRequest.earlyResponse).toBeUndefined()
      expect(logger.info).toHaveBeenCalledWith("Using concurrent aware authentication middleware")
      expect(logger.debug).toHaveBeenCalledWith(
        "Session ID matches the session management item, proceeding with authentication"
      )
    })

    it("should authenticate via token mapping table when only token mapping session ID matches", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: "different-session-id", // Different session ID
        accessToken: "test-session-access-token"
      }
      const tokenMappingItem = {
        username: username,
        sessionId: sessionId, // Matching session ID
        accessToken: "test-token-access-token",
        refreshToken: "test-token-refresh-token",
        expiresAt: Date.now() + 3600000
      }
      const authResult = {
        username: username,
        apigeeAccessToken: "test-apigee-token",
        roleId: "test-role"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem)
        .mockResolvedValueOnce(tokenMappingItem)
      mockAuthenticateRequest.mockResolvedValue(authResult)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).toHaveBeenCalledWith(
        username,
        {
          axiosInstance,
          ddbClient,
          logger,
          authOptions
        },
        tokenMappingItem,
        authOptions.tokenMappingTableName,
        false
      )
      expect(mockEvent.requestContext.authorizer).toEqual({
        ...authResult,
        sessionId: sessionId,
        isConcurrentSession: false
      })
      expect(mockRequest.earlyResponse).toBeUndefined()
      expect(logger.debug).toHaveBeenCalledWith(
        "Session ID matches the token mapping item, proceeding with authentication"
      )
    })

    it("should use session management table over token mapping table if both sessionId match", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: sessionId, // Both match
        accessToken: "test-session-access-token"
      }
      const tokenMappingItem = {
        username: username,
        sessionId: sessionId, // Both match
        accessToken: "test-token-access-token"
      }
      const authResult = {
        username: username,
        apigeeAccessToken: "test-apigee-token"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem)
        .mockResolvedValueOnce(tokenMappingItem)
      mockAuthenticateRequest.mockResolvedValue(authResult)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).toHaveBeenCalledWith(
        username,
        {
          axiosInstance,
          ddbClient,
          logger,
          authOptions
        },
        sessionManagementItem,
        authOptions.sessionManagementTableName,
        false
      )
      expect(mockEvent.requestContext.authorizer.isConcurrentSession).toBe(true)
      expect(logger.debug).toHaveBeenCalledWith(
        "Session ID matches the session management item, proceeding with authentication"
      )
    })
  })

  describe("authentication failure scenarios", () => {
    it("should return 401 when neither session management or token mapping session ID matches", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: "different-session-id-1",
        accessToken: "test-session-access-token"
      }
      const tokenMappingItem = {
        username: username,
        sessionId: "different-session-id-2",
        accessToken: "test-token-access-token"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem)
        .mockResolvedValueOnce(tokenMappingItem)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true,
          invalidSessionCause: "ConcurrentSession"
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
      expect(logger.info).toHaveBeenCalledWith(
        "A session is active but does not match the requestors sessionId",
        {
          username: username,
          sessionId: sessionId
        }
      )
    })

    it("should return 401 when session management item is undefined and token mapping item is undefined", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(undefined) // session management
        .mockResolvedValueOnce(undefined) // token mapping

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true,
          invalidSessionCause: "InvalidSession"
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
    })

    it("should return 401 when session management item is undefined and token mapping session ID doesn't match",
      async () => {
      // Arrange
        const username = "test-user"
        const sessionId = "test-session-id"
        const tokenMappingItem = {
          username: username,
          sessionId: "different-session-id",
          accessToken: "test-token-access-token"
        }

        mockGetUsernameFromEvent.mockReturnValue(username)
        mockGetSessionIdFromEvent.mockReturnValue(sessionId)
        mockTryGetTokenMapping
          .mockResolvedValueOnce(undefined) // session management
          .mockResolvedValueOnce(tokenMappingItem) // token mapping

        const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

        // Act
        const result = await middleware.before(mockRequest)

        // Assert
        expect(mockAuthenticateRequest).not.toHaveBeenCalled()
        expect(mockRequest.earlyResponse).toEqual({
          statusCode: 401,
          body: JSON.stringify({
            message: "Session expired or invalid. Please log in again.",
            restartLogin: true,
            invalidSessionCause: "ConcurrentSession"
          })
        })
        expect(result).toEqual(mockRequest.earlyResponse)
      })

    it("should return 401 when authenticateRequest returns null", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-session-access-token"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem)
        .mockResolvedValueOnce(undefined)
      mockAuthenticateRequest.mockResolvedValue(null)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
    })

    it("should return 401 when authenticateRequest throws an error", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-session-access-token"
      }
      const authError = new Error("Authentication failed")

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem)
        .mockResolvedValueOnce(undefined)
      mockAuthenticateRequest.mockRejectedValue(authError)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
      expect(logger.error).toHaveBeenCalledWith(
        "Authentication failed returning restart login prompt", {error: authError}
      )
    })
  })

  describe("event extraction failures", () => {
    it("should return 401 when getUsernameFromEvent throws an error", async () => {
      // Arrange
      mockGetUsernameFromEvent.mockImplementation(() => {
        throw new Error("Unable to extract username from ID token")
      })

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockGetSessionIdFromEvent).not.toHaveBeenCalled()
      expect(mockTryGetTokenMapping).not.toHaveBeenCalled()
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
      expect(logger.error).toHaveBeenCalledWith(
        "Authentication failed returning restart login prompt",
        expect.objectContaining({
          error: expect.any(Error)
        })
      )
    })

    it("should return 401 when getSessionIdFromEvent throws an error", async () => {
      // Arrange
      const username = "test-user"

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockImplementation(() => {
        throw new Error("Unable to extract sessionId from ID token")
      })

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockTryGetTokenMapping).not.toHaveBeenCalled()
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
      expect(logger.error).toHaveBeenCalledWith(
        "Authentication failed returning restart login prompt",
        expect.objectContaining({
          error: expect.any(Error)
        })
      )
    })
  })

  describe("database operation failures", () => {
    it("should return 401 when tryGetTokenMapping fails for session management table", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const dbError = new Error("DynamoDB error")

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockRejectedValueOnce(dbError) // session management fails
        .mockResolvedValueOnce(undefined) // token mapping succeeds

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
      expect(logger.error).toHaveBeenCalledWith(
        "Authentication failed returning restart login prompt", {error: dbError}
      )
    })

    it("should return 401 when tryGetTokenMapping fails for token mapping table", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const dbError = new Error("DynamoDB error")

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(undefined) // session management succeeds
        .mockRejectedValueOnce(dbError) // token mapping fails

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
      expect(logger.error).toHaveBeenCalledWith(
        "Authentication failed returning restart login prompt", {error: dbError}
      )
    })
  })

  describe("edge cases", () => {
    it("should handle session management item with null sessionId", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: null, // null session ID
        accessToken: "test-session-access-token"
      }
      const tokenMappingItem = {
        username: username,
        sessionId: "different-session-id",
        accessToken: "test-token-access-token"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem)
        .mockResolvedValueOnce(tokenMappingItem)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true,
          invalidSessionCause: "ConcurrentSession"
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
    })

    it("should handle token mapping item with empty string sessionId", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: "different-session-id",
        accessToken: "test-session-access-token"
      }
      const tokenMappingItem = {
        username: username,
        sessionId: "", // empty session ID
        accessToken: "test-token-access-token"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem)
        .mockResolvedValueOnce(tokenMappingItem)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true,
          invalidSessionCause: "ConcurrentSession"
        })
      })
      expect(result).toEqual(mockRequest.earlyResponse)
    })
  })

  describe("middleware integration", () => {
    it("should properly set authorizer with concurrent session flag when authentication succeeds", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const sessionManagementItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-session-access-token"
      }
      const authResult = {
        username: username,
        apigeeAccessToken: "test-apigee-token",
        roleId: "test-role"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(sessionManagementItem)
        .mockResolvedValueOnce(undefined)
      mockAuthenticateRequest.mockResolvedValue(authResult)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      await middleware.before(mockRequest)

      // Assert
      expect(mockEvent.requestContext.authorizer).toEqual({
        ...authResult,
        sessionId: sessionId,
        isConcurrentSession: true
      })
    })

    it("should properly set authorizer with non-concurrent session flag when using token mapping", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const tokenMappingItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-token-access-token"
      }
      const authResult = {
        username: username,
        apigeeAccessToken: "test-apigee-token",
        roleId: "test-role"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockTryGetTokenMapping
        .mockResolvedValueOnce(undefined) // session management
        .mockResolvedValueOnce(tokenMappingItem) // token mapping
      mockAuthenticateRequest.mockResolvedValue(authResult)

      const middleware = authenticationConcurrentAwareMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      await middleware.before(mockRequest)

      // Assert
      expect(mockEvent.requestContext.authorizer).toEqual({
        ...authResult,
        sessionId: sessionId,
        isConcurrentSession: false
      })
    })
  })
})
