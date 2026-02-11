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
import {authenticationMiddleware} from "../src/authenticationMiddleware"

const {
  mockGetUsernameFromEvent,
  mockGetSessionIdFromEvent,
  mockAuthenticateRequest,
  mockGetTokenMapping
} = vi.hoisted(() => ({
  mockGetUsernameFromEvent: vi.fn(),
  mockGetSessionIdFromEvent: vi.fn(),
  mockAuthenticateRequest: vi.fn(),
  mockGetTokenMapping: vi.fn()
}))

vi.mock("../src/event", () => ({
  getUsernameFromEvent: mockGetUsernameFromEvent,
  getSessionIdFromEvent: mockGetSessionIdFromEvent
}))

vi.mock("../src/authenticateRequest", () => ({
  authenticateRequest: mockAuthenticateRequest
}))

vi.mock("@cpt-ui-common/dynamoFunctions", () => ({
  getTokenMapping: mockGetTokenMapping
}))

describe("authenticationMiddleware", () => {
  let logger: Logger
  let ddbClient: DynamoDBDocumentClient
  let axiosInstance: AxiosInstance
  let authOptions: any
  let mockEvent: any
  let mockRequest: any

  beforeEach(() => {
    vi.clearAllMocks()

    logger = new Logger({serviceName: "test"})
    logger.info = vi.fn()
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
      }
    }

    mockRequest = {
      event: mockEvent
    }
  })

  describe("successful authentication flow", () => {
    it("should authenticate successfully when session ID matches token mapping", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const tokenMappingItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000
      }
      const authResult = {
        username: username,
        apigeeAccessToken: "test-apigee-token",
        roleId: "test-role",
        sessionId: sessionId
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)
      mockAuthenticateRequest.mockResolvedValue(authResult)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      await middleware.before(mockRequest)

      // Assert
      expect(mockGetUsernameFromEvent).toHaveBeenCalledWith(mockEvent)
      expect(mockGetSessionIdFromEvent).toHaveBeenCalledWith(mockEvent)
      expect(mockGetTokenMapping).toHaveBeenCalledWith(
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
        tokenMappingItem,
        authOptions.tokenMappingTableName,
        false
      )
      expect(mockEvent.requestContext.authorizer).toEqual(authResult)
      expect(mockRequest.earlyResponse).toBeUndefined()
      expect(logger.info).toHaveBeenCalledWith("Using standard authentication middleware")
      expect(logger.info).toHaveBeenCalledWith(
        "Session ID matches the token mapping item, proceeding with authentication"
      )
    })
  })

  describe("authentication failure scenarios", () => {
    it("should return 401 when session ID does not match token mapping", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const tokenMappingItem = {
        username: username,
        sessionId: "different-session-id", // Different session ID
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

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

    it("should return 401 when token mapping is undefined", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(undefined)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

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

    it("should return 401 when getTokenMapping throws an error", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const error = new Error("DynamoDB error")

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockRejectedValue(error)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

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
        "Authentication failed returning restart login prompt", {error}
      )
    })

    it("should return 401 when authenticateRequest returns null", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const tokenMappingItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)
      mockAuthenticateRequest.mockResolvedValue(null)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

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
      const tokenMappingItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000
      }
      const authError = new Error("Authentication failed")

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)
      mockAuthenticateRequest.mockRejectedValue(authError)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

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

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockGetSessionIdFromEvent).not.toHaveBeenCalled()
      expect(mockGetTokenMapping).not.toHaveBeenCalled()
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

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockGetTokenMapping).not.toHaveBeenCalled()
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

  describe("edge cases", () => {
    it("should handle token mapping with null sessionId", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const tokenMappingItem = {
        username: username,
        sessionId: null, // null session ID
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

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
        {username, sessionId}
      )
    })

    it("should handle empty string session ID in token mapping", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const tokenMappingItem = {
        username: username,
        sessionId: "", // empty session ID
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

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
    it("should properly set authorizer in event when authentication succeeds", async () => {
      // Arrange
      const username = "test-user"
      const sessionId = "test-session-id"
      const tokenMappingItem = {
        username: username,
        sessionId: sessionId,
        accessToken: "test-access-token"
      }
      const authResult = {
        username: username,
        apigeeAccessToken: "test-apigee-token",
        roleId: "test-role",
        sessionId: sessionId,
        isConcurrentSession: false
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)
      mockAuthenticateRequest.mockResolvedValue(authResult)

      const middleware = authenticationMiddleware({axiosInstance, ddbClient, authOptions, logger})

      // Act
      await middleware.before(mockRequest)

      // Assert
      expect(mockEvent.requestContext.authorizer).toBe(authResult)
    })
  })
})
