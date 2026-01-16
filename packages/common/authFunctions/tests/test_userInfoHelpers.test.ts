import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"
import jwksClient from "jwks-rsa"
import {fetchUserInfo} from "../src/userInfoHelpers"

const oidcClientId = "valid_aud"
const oidcIssuer = "valid_iss"
const jwksEndpoint = "https://dummyauth.com/.well-known/jwks.json"

const {
  mockExtractRoleInformation,
  mockVerifyIdToken,
  mockDecodeToken
} = vi.hoisted(() => ({
  mockExtractRoleInformation: vi.fn(),
  mockVerifyIdToken: vi.fn(),
  mockDecodeToken: vi.fn()
}))

const mockLogger: Partial<Logger> = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}

vi.mock("@cpt-ui-common/dynamoFunctions", () => ({
  extractRoleInformation: mockExtractRoleInformation
}))

// We need a dummy verification to pass so we can decode out the selected role ID
vi.mock("../src/cis2", () => {
  mockVerifyIdToken.mockImplementation(async () => ({
    selected_roleid: "role-id-1"
  }))

  mockDecodeToken.mockImplementation(() => ({
    selected_roleid: "role-id-1"
  }))

  return {
    __esModule: true,
    verifyIdToken: mockVerifyIdToken,
    decodeToken: mockDecodeToken
  }
})

describe("fetchUserInfo", () => {
  const accessToken = "test-access-token"
  const idToken = "test-id-token"

  const client = jwksClient({
    jwksUri: `${jwksEndpoint}`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  const oidcConfig = {
    oidcIssuer: oidcIssuer,
    oidcClientID: oidcClientId,
    oidcJwksEndpoint: "https://dummyauth.com/.well-known/jwks.json",
    oidcUserInfoEndpoint: "https://dummyauth.com/userinfo",
    userPoolIdp: "DummyPoolIdentityProvider",
    tokenMappingTableName: "dummyTable",
    sessionManagementTableName: "dummysessiontable",
    jwksClient: client,
    oidcTokenEndpoint: "https://dummyauth.com/token"
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
  })

  it("should fetch and process user info for mock token", async () => {
    const data = {
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
        },
        {
          role_name: "Doctor",
          person_roleid: "role-id-3",
          org_code: "ORG3",
          activity_codes: ["CPT_CODE"],
          person_orgid: "org-id-3",
          role_code: "role-code-3"
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
        },
        {
          org_code: "ORG3",
          org_name: "Organization Three"
        }
      ]
    }

    const getSpy = vi.spyOn(axios, "get").mockResolvedValue({data})

    mockVerifyIdToken.mockImplementation(async () => {
      return {
        selected_roleid: "role-id-1"
      }
    })

    mockDecodeToken.mockImplementation(() => {
      return {
        payload: {
          selected_roleid: "role-id-1"
        }
      }
    })

    mockExtractRoleInformation.mockImplementationOnce(() => {
      return {
        roles_with_access: [
          {
            role_name: "Doctor",
            role_id: "role-id-3",
            org_code: "ORG3",
            org_name: "Organization Three"
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
      }
    })
    const result = await fetchUserInfo(
      accessToken,
      idToken,
      "apigee_access_token",
      true,
      mockLogger as Logger,
      oidcConfig
    )

    expect(result).toEqual({
      roles_with_access: [
        {
          role_name: "Doctor",
          role_id: "role-id-3",
          org_code: "ORG3",
          org_name: "Organization Three"
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
    expect(getSpy).toHaveBeenCalledWith(
      "https://dummyauth.com/userinfo",
      {"headers": {"Authorization": "Bearer apigee_access_token"}}
    )
    expect(mockDecodeToken).not.toHaveBeenCalled()
  })

  it("should fetch and process user info for cis2 token", async () => {
    const data = {
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
        },
        {
          role_name: "Doctor",
          person_roleid: "role-id-3",
          org_code: "ORG3",
          activity_codes: ["CPT_CODE"],
          person_orgid: "org-id-3",
          role_code: "role-code-3"
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
        },
        {
          org_code: "ORG3",
          org_name: "Organization Three"
        }
      ]
    }

    const getSpy = vi.spyOn(axios, "get").mockResolvedValue({data})

    mockVerifyIdToken.mockImplementation(async () => {
      return {
        selected_roleid: "role-id-1"
      }
    })

    mockDecodeToken.mockImplementation(() => {
      return {
        payload: {
          selected_roleid: "role-id-1"
        }
      }
    })

    mockExtractRoleInformation.mockImplementationOnce(() => {
      return {
        roles_with_access: [
          {
            role_name: "Doctor",
            role_id: "role-id-3",
            org_code: "ORG3",
            org_name: "Organization Three"
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
      }
    })
    const result = await fetchUserInfo(
      accessToken,
      idToken,
      "apigee_access_token",
      false,
      mockLogger as Logger,
      oidcConfig
    )

    expect(result).toEqual({
      roles_with_access: [
        {
          role_name: "Doctor",
          role_id: "role-id-3",
          org_code: "ORG3",
          org_name: "Organization Three"
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
    expect(getSpy).toHaveBeenCalledWith(
      "https://dummyauth.com/userinfo",
      {"headers": {"Authorization": "Bearer test-access-token"}}
    )
    expect(mockDecodeToken).toHaveBeenCalled()
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
        "foo",
        true,
        mockLogger as Logger,
        clonedOidcConfig
      )
    ).rejects.toThrow("OIDC UserInfo endpoint not set")
  })

  it("should throw an error if axios request fails", async () => {
    vi.spyOn(axios, "get").mockRejectedValue(new Error("Network error"))

    await expect(
      fetchUserInfo(
        accessToken,
        idToken,
        "foo",
        true,
        mockLogger as Logger,
        oidcConfig
      )
    ).rejects.toThrow("Error fetching user info")
  })
})
