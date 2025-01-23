import {jest} from "@jest/globals"

import {OidcConfig} from "@cpt-ui-common/authFunctions"
import {UserInfoResponse, TrackerUserInfo} from "../src/userInfoTypes"

import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import jwksClient from "jwks-rsa"

const oidcClientId = "valid_aud"
const oidcIssuer = "valid_iss"
const jwksEndpoint = "https://dummyauth.com/.well-known/jwks.json"

const mockVerifyIdToken = jest.fn()

// We need a dummy verification to pass so we can decode out the selected role ID
jest.unstable_mockModule("@cpt-ui-common/authFunctions", async () => {
  const verifyIdToken = mockVerifyIdToken.mockImplementation(async () => {
    return {
      selected_roleid: "role-id-1"
    }
  })

  return {
    __esModule: true,
    // This will need to be made to return the decoded ID token, which should be like:
    // { selected_roleid: "foo" }
    verifyIdToken: verifyIdToken
  }
})

const {fetchUserInfo, updateDynamoTable} = await import("../src/userInfoHelpers")

describe("fetchUserInfo", () => {
  const logger = new Logger()
  const accessToken = "test-access-token"
  const idToken = "test-id-token"
  const acceptedAccessCodes = ["CPT_CODE"]

  const client = jwksClient({
    jwksUri: `${jwksEndpoint}`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  const oidcConfig: OidcConfig = {
    oidcIssuer: oidcIssuer,
    oidcClientID: oidcClientId,
    oidcJwksEndpoint: "https://dummyauth.com/.well-known/jwks.json",
    oidcUserInfoEndpoint:  "https://dummyauth.com/userinfo",
    userPoolIdp: "DummyPoolIdentityProvider",
    tokenMappingTableName: "dummyTable",
    jwksClient: client
  }

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  afterEach(() => {
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

    mockVerifyIdToken.mockImplementation(async () => {
      return {
        selected_roleid: "role-id-1"
      }
    })

    const result = await fetchUserInfo(
      accessToken,
      idToken,
      acceptedAccessCodes,
      logger,
      oidcConfig
    )

    expect(result).toEqual({
      roles_with_access: [
        {
          role_name: "Doctor",
          role_id: "role-id-1",
          org_code: "ORG1",
          org_name: "Organization One"
        }
      ],
      roles_without_access: [
        {
          role_name: "Nurse",
          role_id: "role-id-2",
          org_code: "ORG2",
          org_name: "Organization Two"
        }
      ],
      currently_selected_role: {
        role_name: "Doctor",
        role_id: "role-id-1",
        org_code: "ORG1",
        org_name: "Organization One"
      },
      user_details: {
        family_name: "Doe",
        given_name: "John"
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
      idToken,
      acceptedAccessCodes,
      logger,
      oidcConfig
    )

    expect(result).toEqual({
      roles_with_access: [],
      roles_without_access: [
        {
          role_name: "Receptionist",
          role_id: "role-id-3",
          org_code: "ORG3",
          org_name: "Organization Three"
        }
      ],
      currently_selected_role: undefined,
      user_details: {
        family_name: "Smith",
        given_name: "Jane"
      }
    })
  })

  it("should throw an error if userInfoEndpoint is not set", async () => {
    const clonedOidcConfig = {
      ...oidcConfig
    }
    clonedOidcConfig.oidcUserInfoEndpoint = ""

    await expect(
      fetchUserInfo(
        accessToken,
        idToken,
        acceptedAccessCodes,
        logger,
        clonedOidcConfig
      )
    ).rejects.toThrow("OIDC UserInfo endpoint not set")
  })

  it("should throw an error if axios request fails", async () => {
    jest.spyOn(axios, "get").mockRejectedValue(new Error("Network error"))

    await expect(
      fetchUserInfo(
        accessToken,
        idToken,
        acceptedAccessCodes,
        logger,
        oidcConfig
      )
    ).rejects.toThrow("Error fetching user info")
  })
})

jest.mock("@aws-sdk/lib-dynamodb")

describe("updateDynamoTable", () => {
  const logger = new Logger()
  const dynamoDBClient = new DynamoDBClient({})
  const documentClient = DynamoDBDocumentClient.from(dynamoDBClient)

  beforeEach(() => {
    jest.restoreAllMocks()

    // Mock the documentClient send method
    jest.spyOn(documentClient, "send").mockImplementation(() => Promise.resolve({}))
  })

  const username = "testUser"
  const data: TrackerUserInfo = {
    roles_with_access: [
      {
        role_name: "Doctor",
        role_id: "123",
        org_code: "ABC",
        org_name: "Test Hospital",
        site_name: "Main",
        site_address: "123 Street"
      }
    ],
    roles_without_access: [
      {
        role_name: "Nurse",
        role_id: "456",
        org_code: "DEF",
        org_name: "Test Clinic",
        site_name: "Branch",
        site_address: "456 Avenue"
      }
    ],
    currently_selected_role: {
      role_name: "Doctor",
      role_id: "123",
      org_code: "ABC",
      org_name: "Test Hospital",
      site_name: "Main",
      site_address: "123 Street"
    },
    user_details: {
      family_name: "FAMILY",
      given_name: "GIVEN"
    }
  }

  it("should update DynamoDB with user roles successfully", async () => {

    // Expect not to run into an error
    await updateDynamoTable(username, data, documentClient, logger, "dummyTable")

    // Expect successful call to DynamoDB
    expect(documentClient.send).toHaveBeenCalled()
  })

  it("should throw an error when TokenMappingTableName is not set", async () => {
    await expect(
      updateDynamoTable(username, data, documentClient, logger, "")
    ).rejects.toThrow("Token mapping table name not set")

    expect(documentClient.send).not.toHaveBeenCalled()
  })

  it("should handle DynamoDB update errors", async () => {
    // This is async
    jest.spyOn(documentClient, "send").mockImplementation(() => Promise.reject(
      new Error("Error adding user roles to DynamoDB"))
    )

    await expect(
      updateDynamoTable(username, data, documentClient, logger, "dummyTable")
    ).rejects.toThrow("Error adding user roles to DynamoDB")
  })
})
