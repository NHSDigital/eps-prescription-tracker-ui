/* eslint-disable @typescript-eslint/no-explicit-any */
import {jest} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {AxiosInstance} from "axios"

// Mock dependencies
const mockGetUsernameFromEvent = jest.fn().mockName("mockGetUsernameFromEvent") as jest.MockedFunction<any>
const mockGetSessionIdFromEvent = jest.fn().mockName("mockGetSessionIdFromEvent") as jest.MockedFunction<any>
const mockAuthenticateRequest = jest.fn().mockName("mockAuthenticateRequest") as jest.MockedFunction<any>
const mockGetTokenMapping = jest.fn().mockName("mockGetTokenMapping") as jest.MockedFunction<any>
const mockTryGetTokenMapping = jest.fn().mockName("mockTryGetTokenMapping") as jest.MockedFunction<any>

jest.unstable_mockModule("../src/event", () => ({
  getUsernameFromEvent: mockGetUsernameFromEvent,
  getSessionIdFromEvent: mockGetSessionIdFromEvent
}))

jest.unstable_mockModule("../src/authenticateRequest", () => ({
  authenticateRequest: mockAuthenticateRequest
}))

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => ({
  getTokenMapping: mockGetTokenMapping,
  tryGetTokenMapping: mockTryGetTokenMapping
}))

// Import the middleware after mocking
const {authenticationMiddleware} = await import("../src/authenticationMiddleware")

describe("authenticationMiddleware", () => {
  let logger: Logger
  let ddbClient: DynamoDBDocumentClient
  let axiosInstance: AxiosInstance
  let authOptions: any
  let mockEvent: any
  let mockRequest: any

  beforeEach(() => {
    jest.clearAllMocks()

    logger = new Logger({serviceName: "test"})
    logger.info = jest.fn()
    logger.error = jest.fn()

    const dynamoClient = new DynamoDBClient({})
    ddbClient = DynamoDBDocumentClient.from(dynamoClient)

    axiosInstance = {
      post: jest.fn(),
      get: jest.fn()
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
            "cognito:username": "Mock_test-user",
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
      const username = "Mock_test-user"
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

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
        axiosInstance,
        ddbClient,
        logger,
        authOptions,
        tokenMappingItem,
        authOptions.tokenMappingTableName
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
      const username = "Mock_test-user"
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

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
        "Session ID does not match the token mapping item, treating as invalid session"
      )
    })

    it("should return 401 when token mapping is undefined", async () => {
      // Arrange
      const username = "Mock_test-user"
      const sessionId = "test-session-id"

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockResolvedValue(undefined)

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
    })

    it("should return 401 when getTokenMapping throws an error", async () => {
      // Arrange
      const username = "Mock_test-user"
      const sessionId = "test-session-id"
      const error = new Error("DynamoDB error")

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockReturnValue(sessionId)
      mockGetTokenMapping.mockRejectedValue(error)

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
      const username = "Mock_test-user"
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

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

      // Act
      const result = await middleware.before(mockRequest)

      // Assert
      expect(mockAuthenticateRequest).toHaveBeenCalledWith(
        username,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        authOptions,
        tokenMappingItem,
        authOptions.tokenMappingTableName
      )
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
      const username = "Mock_test-user"
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

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
      const username = "Mock_test-user"

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetSessionIdFromEvent.mockImplementation(() => {
        throw new Error("Unable to extract sessionId from ID token")
      })

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
      const username = "Mock_test-user"
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

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
        "Session ID does not match the token mapping item, treating as invalid session"
      )
    })

    it("should handle empty string session ID in token mapping", async () => {
      // Arrange
      const username = "Mock_test-user"
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

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
    })
  })

  describe("middleware integration", () => {
    it("should properly set authorizer in event when authentication succeeds", async () => {
      // Arrange
      const username = "Mock_test-user"
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

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

      // Act
      await middleware.before(mockRequest)

      // Assert
      expect(mockEvent.requestContext.authorizer).toBe(authResult)
    })
  })

  describe("temporary cis2 login measures", () => {
    it("should authenticate againt a cis2 token by verifying the username\
      and not verify missing sessionId", async () => {
      // Arrange
      const username = "test-user" // validates against username to detect cis2 user
      const tokenMappingItem = {
        username: username,
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000
      }
      const authResult = {
        username: username,
        apigeeAccessToken: "test-apigee-token",
        roleId: "test-role"
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)
      mockAuthenticateRequest.mockResolvedValue(authResult)

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
        axiosInstance,
        ddbClient,
        logger,
        authOptions,
        tokenMappingItem,
        authOptions.tokenMappingTableName
      )
      expect(mockEvent.requestContext.authorizer).toEqual(authResult)
      expect(mockRequest.earlyResponse).toBeUndefined()
      expect(logger.info).toHaveBeenCalledWith("Using standard authentication middleware")
      expect(logger.info).toHaveBeenCalledWith(
        "Non-mock token detected, proceeding with standard authentication"
      )
    })

    it("should error against a cis2 token appropriately", async () => {
      // Arrange
      const username = "test-user" // validates against username to detect cis2 user
      const tokenMappingItem = {
        username: username,
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000
      }

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetTokenMapping.mockResolvedValue(tokenMappingItem)
      mockAuthenticateRequest.mockResolvedValue(null) // simulate auth failure

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
        axiosInstance,
        ddbClient,
        logger,
        authOptions,
        tokenMappingItem,
        authOptions.tokenMappingTableName
      )
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      })
      expect(logger.info).toHaveBeenCalledWith("Using standard authentication middleware")
      expect(logger.info).toHaveBeenCalledWith(
        "Non-mock token detected, proceeding with standard authentication"
      )
    })

    it("should return invalid session against a cis2 token \
      if no token mapping item exists", async () => {
      // Arrange
      const username = "test-user" // validates against username to detect cis2 user

      mockGetUsernameFromEvent.mockReturnValue(username)
      mockGetTokenMapping.mockImplementation(() => {
        throw new Error("Simulated getTokenMapping failure")
      }) // Cause getTokenMapping to raise undefined error as if tryGetTokenMapping was undefined

      const middleware = authenticationMiddleware(axiosInstance, ddbClient, authOptions, logger)

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
      expect(mockAuthenticateRequest).not.toHaveBeenCalled()
      expect(mockRequest.earlyResponse).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      })
      expect(logger.info).toHaveBeenCalledWith("Using standard authentication middleware")
      expect(logger.error).toHaveBeenCalledWith(
        "Authentication failed returning restart login prompt", expect.anything()
      )
    })
  })
})
