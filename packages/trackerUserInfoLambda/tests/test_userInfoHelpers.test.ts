import {jest} from "@jest/globals"
import {UserInfoResponse} from "../src/userInfoHelpers"
import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"

const mockDecodeToken = jest.fn(() => ({selected_roleid: "role-id-1"}))

// We need a dummy verification to pass so we can decode out the selected role ID
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    decodeToken: mockDecodeToken
  }
})

const {fetchUserInfo} = await import("../src/userInfoHelpers")

describe("fetchUserInfo", () => {
  const logger = new Logger()
  const accessToken = "test-access-token"
  const idToken = "test-id-token"
  const acceptedAccessCodes = ["CPT_CODE"]

  const oidcTokenEndpoint = "https://dummyauth.com/token"

  beforeEach(() => {
    jest.restoreAllMocks()
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

    jest.spyOn(axios, "get").mockResolvedValue({data: userInfoResponse})

    const result = await fetchUserInfo(
      accessToken,
      idToken,
      acceptedAccessCodes,
      logger,
      oidcTokenEndpoint
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
      oidcTokenEndpoint
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

  it("should throw an error if axios request fails", async () => {
    jest.spyOn(axios, "get").mockRejectedValue(new Error("Network error"))

    await expect(
      fetchUserInfo(
        accessToken,
        idToken,
        acceptedAccessCodes,
        logger,
        oidcTokenEndpoint
      )
    ).rejects.toThrow("Network error")
  })
})
