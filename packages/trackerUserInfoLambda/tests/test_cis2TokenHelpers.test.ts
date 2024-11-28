import {jest} from "@jest/globals"

import {
  getSigningKey,
  getUsernameFromEvent,
  fetchCIS2TokensFromDynamoDB,
  fetchAndVerifyCIS2Tokens,
  verifyIdToken,
  fetchUserInfo
} from "../src/cis2TokenHelpers"
import {UserInfoResponse} from "../src/cis2TokenTypes"

import {APIGatewayProxyEvent} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import jwksClient from "jwks-rsa"
import jwt from "jsonwebtoken"
import axios from "axios"
import {createJWKSMock, } from "mock-jwks"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"

describe("getSigningKey", () => {
  let client: jwksClient.JwksClient

  beforeEach(() => {
    client = jwksClient({
      jwksUri: "https://example.com/.well-known/jwks.json"
    })
  })

  it("should return the signing key when key is found", async () => {
    const kid = "test-key-id"
    const publicKey = "test-public-key"

    jest.spyOn(client, "getSigningKey")
      .mockImplementation(
        (kid, callback: (err: Error | null, key: jwksClient.SigningKey | undefined) => void) => {
          callback(null, {
            getPublicKey: () => publicKey
          } as jwksClient.SigningKey)
        }
      )

    const key = await getSigningKey(client, kid)
    expect(key).toBe(publicKey)
  })

  it("should throw an error when key is not found", async () => {
    const kid = "non-existent-key-id"

    jest.spyOn(client, "getSigningKey").mockImplementation((kid, callback) => {
      callback(new Error("Key not found"), undefined)
    })

    await expect(getSigningKey(client, kid)).rejects.toThrow("Key not found")
  })
})

describe("getUsernameFromEvent", () => {
  it("should extract the username from the event", () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": "test-username"
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const username = getUsernameFromEvent(event)
    expect(username).toBe("test-username")
  })

  it("should throw an error if username is not present", () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: {}
        }
      }
    } as unknown as APIGatewayProxyEvent

    expect(() => getUsernameFromEvent(event)).toThrow(
      "Unable to extract username from ID token"
    )
  })
})

describe("fetchCIS2TokensFromDynamoDB", () => {
  const logger = new Logger()
  const dynamoDBClient = new DynamoDBClient({})
  const documentClient = DynamoDBDocumentClient.from(dynamoDBClient)

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("should fetch tokens from DynamoDB", async () => {
    const username = "test-username"
    const tableName = "TokenMappingTable"

    const cis2AccessToken = "test-access-token"
    const cis2IdToken = "test-id-token"

    jest.spyOn(documentClient, "send")
      .mockImplementation(() => Promise.resolve({
        Item: {
          CIS2_accessToken: cis2AccessToken,
          CIS2_idToken: cis2IdToken
        }
      })
      )

    const result = await fetchCIS2TokensFromDynamoDB(
      username,
      tableName,
      documentClient,
      logger
    )
    expect(result).toEqual({cis2AccessToken, cis2IdToken})

    expect(documentClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: tableName,
          Key: {username}
        }
      })
    )
  })

  it("should throw an error if tokens not found", async () => {
    const username = "test-username"
    const tableName = "TokenMappingTable"

    jest.spyOn(documentClient, "send").mockImplementation(() => Promise.resolve({}))

    await expect(
      fetchCIS2TokensFromDynamoDB(username, tableName, documentClient, logger)
    ).rejects.toThrow("CIS2 access token not found for user")
  })

  it("should throw an error on DynamoDB error", async () => {
    const username = "test-username"
    const tableName = "TokenMappingTable"
  
    jest
      .spyOn(documentClient, "send")
      .mockImplementation(() => Promise.reject(new Error("DynamoDB error")))
  
    await expect(
      fetchCIS2TokensFromDynamoDB(username, tableName, documentClient, logger)
    ).rejects.toThrow("Internal server error while accessing DynamoDB")  
  })
})

describe("fetchAndVerifyCIS2Tokens", () => {
    const logger = new Logger()
    const dynamoDBClient = new DynamoDBClient({})
    const documentClient = DynamoDBDocumentClient.from(dynamoDBClient)
    
    const jwksMock = createJWKSMock(process.env["oidcjwksEndpoint"] as string)
    
    const username = "test-username"
    const cis2IdToken = {
        iss: process.env["oidcIssuer"],
        aud: process.env["oidcClientId"],
        exp: Math.floor(Date.now() / 1000) + 3600,
        acr: "AAL3_ANY",
        auth_time: Math.floor(Date.now() / 1000)
    } as jwt.JwtPayload
    const cis2AccessToken = "test-access-token"

    console.info("accessToken", cis2AccessToken)
    const validKid = jwksMock.kid()

    jwksMock.start()

    const originalTokenMappingTableName = process.env["TokenMappingTableName"]

  beforeEach(() => {
    jest.restoreAllMocks()
    process.env["TokenMappingTableName"] = originalTokenMappingTableName
  })

  afterEach(() => {
    delete process.env["TokenMappingTableName"]
  })

  it("should fetch and verify tokens", async () => {

    const event = {
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": username
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    jest.spyOn(documentClient, "send")
        .mockImplementation(() => Promise.resolve({
            Item: {
                CIS2_accessToken: cis2AccessToken,
                CIS2_idToken: cis2IdToken
            }
        })
    )

    jest.spyOn(jwt, "decode").mockReturnValue({
        header: {kid: validKid}
    })

    jest.spyOn(jwt, "verify").mockImplementation(() => cis2IdToken)

    await expect(
      fetchAndVerifyCIS2Tokens(event, documentClient, logger)
    ).resolves.toEqual({
      cis2AccessToken,
      cis2IdToken
    })
  })

  it("should throw an error if TokenMappingTableName is not set", async () => {
    delete process.env["TokenMappingTableName"]

    const event = {
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": "test-username"
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    await expect(
      fetchAndVerifyCIS2Tokens(event, documentClient, logger)
    ).rejects.toThrow("Token mapping table name not set")
  })
})

describe("verifyIdToken", () => {
    const logger = new Logger()
  
    const oidcClientId = process.env["oidcClientId"] as string
  
    const jwksMock = createJWKSMock(process.env["oidcjwksEndpoint"] as string)
    const oidcIssuer = process.env["oidcIssuer"]
    
    jwksMock.start()

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it("should verify a valid ID token", async () => {
      // Arrange
      const payload = {
        iss: oidcIssuer,
        aud: [oidcClientId],
        exp: Math.floor(Date.now() / 1000) + 3600,
        acr: "AAL3_ANY",
        auth_time: Math.floor(Date.now() / 1000)
      }
  
      const token = jwksMock.token(payload)

      jest.spyOn(jwt, "verify").mockImplementation(() => payload)
  
      // Act and Assert
      await expect(verifyIdToken(token, logger)).resolves.toBeUndefined()
    })
  
    it("should throw an error when ID token is not provided", async () => {
      // Act and Assert
      await expect(verifyIdToken("", logger)).rejects.toThrow("ID token not provided")
    })
  
    it("should throw an error when ID token cannot be decoded", async () => {
      // Act and Assert
      await expect(verifyIdToken("invalid-token", logger)).rejects.toThrow("Invalid token")
    })
  
    it("should throw an error when ID token header does not contain kid", async () => {
      // Arrange
      const payload = {
        iss: oidcIssuer,
        aud: [oidcClientId],
        exp: Math.floor(Date.now() / 1000) + 3600,
        acr: "AAL3_ANY",
        auth_time: Math.floor(Date.now() / 1000)
      }
  
      const token = jwksMock.token(payload)

      jest.spyOn(jwt, "decode").mockReturnValue({header: {}})

        // Act and Assert
        await expect(verifyIdToken(token, logger)).rejects.toThrow("Invalid token - no KID present")
    })
  
    it("should throw an error when getting signing key fails", async () => {
      // Arrange
      const payload = {
        iss: oidcIssuer,
        aud: oidcClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        acr: "AAL3_ANY",
        auth_time: Math.floor(Date.now() / 1000)
      }
  
      const token = jwksMock.token(payload)
  
      // Mock jwksClient.JwksClient.getSigningKey to throw an error
        jest.spyOn(jwksClient.JwksClient.prototype, "getSigningKey").mockImplementation(() => {
            throw new Error("Error getting signing key")
        })

      // Act and Assert
      await expect(verifyIdToken(token, logger)).rejects.toThrow("Error getting signing key")
    })
  
    it("should throw an error when jwt.verify fails", async () => {
      // Arrange
      const payload = {
        iss: oidcIssuer,
        aud: oidcClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        acr: "AAL3_ANY",
        auth_time: Math.floor(Date.now() / 1000)
      }
  
      const token = jwksMock.token(payload)
  
      // Mock jwt.verify to throw an error
      jest.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("Invalid signature")
      })
  
      // Act and Assert
      await expect(verifyIdToken(token, logger)).rejects.toThrow("Invalid ID token")
    })
  
    it("should throw an error when ID token is expired", async () => {
      // Arrange
      const payload = {
        iss: oidcIssuer,
        aud: oidcClientId,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired token
        acr: "AAL3_ANY",
        auth_time: Math.floor(Date.now() / 1000) - 7200
      }
  
      const token = jwksMock.token(payload)

      // Mock the jwt.verify to return payload
      jest.spyOn(jwt, "verify").mockImplementation(() => payload)
  
      // Act and Assert
      await expect(verifyIdToken(token, logger)).rejects.toThrow("ID token has expired")
    })
  
    it("should throw an error when issuer does not match", async () => {
      // Arrange
      const payload = {
        iss: "https://wrong-issuer.com",
        aud: oidcClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        acr: "AAL3_ANY",
        auth_time: Math.floor(Date.now() / 1000)
      }
  
      const token = jwksMock.token(payload)
  
      // Act and Assert
      await expect(verifyIdToken(token, logger)).rejects.toThrow("Invalid issuer in ID token")
    })
  
    it("should throw an error when audience does not match", async () => {
      // Arrange
      const payload = {
        iss: oidcIssuer,
        aud: "wrong-client-id",
        exp: Math.floor(Date.now() / 1000) + 3600,
        acr: "AAL3_ANY",
        auth_time: Math.floor(Date.now() / 1000)
      }
  
      const token = jwksMock.token(payload)
  
      // Act and Assert
      await expect(verifyIdToken(token, logger)).rejects.toThrow("Invalid audience in ID token")
    })
  
    it("should throw an error when ACR claim is invalid", async () => {
      // Arrange
      const payload = {
        iss: oidcIssuer,
        aud: oidcClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        acr: "INVALID_ACR",
        auth_time: Math.floor(Date.now() / 1000)
      }
  
      const token = jwksMock.token(payload)
  
      // Act and Assert
      await expect(verifyIdToken(token, logger)).rejects.toThrow("Invalid ACR claim in ID token")
    })
  })

describe("fetchUserInfo", () => {
  const logger = new Logger()
  const accessToken = "test-access-token"
  const acceptedAccessCodes = ["CPT_CODE"]
  const selectedRoleId = "role-id-1"

  beforeEach(() => {
    jest.clearAllMocks()
    process.env["userInfoEndpoint"] = "https://dummyauth.com/userinfo"
  })

  afterEach(() => {
    delete process.env["userInfoEndpoint"]
  })

  it("should fetch and process user info", async () => {
    const userInfoResponse: UserInfoResponse = {
      sub: "test-sub",
      uid: "test-uid",
      email: "test@example.com",
      nhsid_useruid: "test-useruid",
      given_name: "John",
      family_name: "Doe",
      name: "John Doe",
      display_name: "J. Doe",
      title: "Dr.",
      initials: "JD",
      middle_names: "William",
      nhsid_nrbac_roles: [
        {
          role_name: "Doctor",
          person_roleid: "role-id-1",
          org_code: "ORG1",
          activity_codes: ["CPT_CODE"],
          person_orgid: "org-id-1",
          role_code: "role-code-1"
        },
        {
          role_name: "Nurse",
          person_roleid: "role-id-2",
          org_code: "ORG2",
          activity_codes: ["OTHER_CODE"],
          person_orgid: "org-id-2",
          role_code: "role-code-2"
        }
      ],
      nhsid_user_orgs: [
        {
          org_code: "ORG1",
          org_name: "Organization One"
        },
        {
          org_code: "ORG2",
          org_name: "Organization Two"
        }
      ]
    }

    jest.spyOn(axios, "get").mockResolvedValue({data: userInfoResponse})

    const result = await fetchUserInfo(
      accessToken,
      acceptedAccessCodes,
      selectedRoleId,
      logger
    )

    expect(result).toEqual({
      user_details: {
        given_name: "John",
        family_name: "Doe",
        name: "John Doe",
        display_name: "J. Doe",
        title: "Dr.",
        initials: "JD",
        middle_names: "William"
      },
      roles_with_access: [
        {
          roleName: "Doctor",
          roleID: "role-id-1",
          ODS: "ORG1",
          orgName: "Organization One"
        }
      ],
      roles_without_access: [
        {
          roleName: "Nurse",
          roleID: "role-id-2",
          ODS: "ORG2",
          orgName: "Organization Two"
        }
      ],
      currently_selected_role: {
        roleName: "Doctor",
        roleID: "role-id-1",
        ODS: "ORG1",
        orgName: "Organization One"
      }
    })
  })

  it("should handle user with no roles with access", async () => {
    const userInfoResponse: UserInfoResponse = {
      sub: "test-sub",
      uid: "test-uid",
      email: "test@example.com",
      nhsid_useruid: "test-useruid",
      given_name: "Jane",
      family_name: "Smith",
      name: "Jane Smith",
      display_name: "J. Smith",
      title: "Ms.",
      initials: "JS",
      middle_names: "Marie",
      nhsid_nrbac_roles: [
        {
          role_name: "Receptionist",
          person_roleid: "role-id-3",
          org_code: "ORG3",
          activity_codes: ["OTHER_CODE"],
          person_orgid: "org-id-3",
          role_code: "role-code-3"
        }
      ],
      nhsid_user_orgs: [
        {
          org_code: "ORG3",
          org_name: "Organization Three"
        }
      ]
    }

    jest.spyOn(axios, "get").mockResolvedValue({data: userInfoResponse})

    const result = await fetchUserInfo(
      accessToken,
      acceptedAccessCodes,
      undefined,
      logger
    )

    expect(result).toEqual({
      user_details: {
        given_name: "Jane",
        family_name: "Smith",
        name: "Jane Smith",
        display_name: "J. Smith",
        title: "Ms.",
        initials: "JS",
        middle_names: "Marie"
      },
      roles_with_access: [],
      roles_without_access: [
        {
          roleName: "Receptionist",
          roleID: "role-id-3",
          ODS: "ORG3",
          orgName: "Organization Three"
        }
      ],
      currently_selected_role: undefined
    })
  })

  it("should throw an error if userInfoEndpoint is not set", async () => {
    delete process.env["userInfoEndpoint"]

    await expect(
      fetchUserInfo(accessToken, acceptedAccessCodes, selectedRoleId, logger)
    ).rejects.toThrow("OIDC UserInfo endpoint not set")
  })

  it("should throw an error if axios request fails", async () => {
    jest.spyOn(axios, "get").mockRejectedValue(new Error("Network error"))

    await expect(
      fetchUserInfo(accessToken, acceptedAccessCodes, selectedRoleId, logger)
    ).rejects.toThrow("Error fetching user info")
  })
})
