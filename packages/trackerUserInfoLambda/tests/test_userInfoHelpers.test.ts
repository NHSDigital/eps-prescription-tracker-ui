import {jest} from "@jest/globals"

import {
  fetchUserInfo
} from "../src/userInfoHelpers"
import {UserInfoResponse} from "../src/userInfoTypes"

import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"


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
  
