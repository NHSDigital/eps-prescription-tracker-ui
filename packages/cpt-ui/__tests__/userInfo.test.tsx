import {getTrackerUserInfo} from "@/helpers/userInfo"
import {RoleDetails, UserDetails} from "@cpt-ui-common/common-types"
import axios from "@/helpers/axios"
jest.mock("@/helpers/axios")
const mockedAxios = axios as jest.Mocked<typeof axios>

type ExpectedResult = {
  hasNoAccess: boolean,
  hasSingleRoleAccess: boolean,
  numberOfCallsToUpdateSelectedRole: number
}
type TestCase = {
  name: string,
  currentlySelectedRole: RoleDetails | undefined,
  rolesWithAccess: Array<RoleDetails>,
  rolesWithoutAccess: Array<RoleDetails>
  userDetails: UserDetails,
  expected: ExpectedResult
}
describe("getTrackerUserInfo", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    mockedAxios.put.mockResolvedValue({status: 200})
  })

  const testCases: Array<TestCase> = [
    {
      name: "user with one role with access",
      currentlySelectedRole: {
        role_id: "ROLE123",
        role_name: "Pharmacist",
        org_name: "Test Pharmacy Org",
        org_code: "ORG123",
        site_address: "1 Fake Street"
      },
      rolesWithAccess: [
        {
          role_id: "ROLE123",
          role_name: "Pharmacist",
          org_name: "Test Pharmacy Org",
          org_code: "ORG123",
          site_address: "1 Fake Street"
        }
      ],
      rolesWithoutAccess: [],
      userDetails: {
        family_name: "FAMILY",
        given_name: "GIVEN"
      },
      expected: {
        hasNoAccess: false,
        hasSingleRoleAccess: true,
        numberOfCallsToUpdateSelectedRole: 1
      }
    },
    {
      name: "user with no access roles",
      currentlySelectedRole: undefined,
      rolesWithAccess: [],
      rolesWithoutAccess: [
        {
          role_id: "ROLE999",
          role_name: "Admin",
          org_name: "Other Org",
          org_code: "ORG999",
          site_address: "2 Fake Street"
        }
      ],
      userDetails: {
        family_name: "DOE",
        given_name: "JOHN"
      },
      expected: {
        hasNoAccess: true,
        hasSingleRoleAccess: false,
        numberOfCallsToUpdateSelectedRole: 0
      }
    },
    {
      name: "user with multiple roles",
      currentlySelectedRole: {
        role_id: "ROLE123",
        role_name: "Pharmacist",
        org_name: "Test Pharmacy Org",
        org_code: "ORG123",
        site_address: "1 Fake Street"
      },
      rolesWithAccess: [
        {
          role_id: "ROLE123",
          role_name: "Pharmacist",
          org_name: "Test Pharmacy Org",
          org_code: "ORG123",
          site_address: "1 Fake Street"
        },
        {
          role_id: "ROLE124",
          role_name: "Technician",
          org_name: "Second Org",
          org_code: "ORG124",
          site_address: "2 Fake Street"
        }
      ],
      rolesWithoutAccess: [],
      userDetails: {
        family_name: "SMITH",
        given_name: "ANNA"
      },
      expected: {
        hasNoAccess: false,
        hasSingleRoleAccess: false,
        numberOfCallsToUpdateSelectedRole: 0
      }
    }
  ]

  it.each(testCases)(
    "should return correct user info for case: $name",
    async ({
      currentlySelectedRole,
      rolesWithAccess,
      rolesWithoutAccess,
      userDetails,
      expected
    }) => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: {
          userInfo: {
            currently_selected_role: currentlySelectedRole,
            roles_with_access: rolesWithAccess,
            roles_without_access: rolesWithoutAccess,
            user_details: userDetails
          }
        }
      })

      const result = await getTrackerUserInfo()

      expect(result.selectedRole).toStrictEqual(currentlySelectedRole)
      expect(result.rolesWithAccess).toStrictEqual(rolesWithAccess)
      expect(result.rolesWithoutAccess).toStrictEqual(rolesWithoutAccess)
      expect(result.userDetails).toStrictEqual(userDetails)
      expect(result.hasNoAccess).toBe(expected.hasNoAccess)
      expect(result.hasSingleRoleAccess).toBe(expected.hasSingleRoleAccess)
      expect(result.error).toBeNull()
      expect(mockedAxios.put).toHaveBeenCalledTimes(expected.numberOfCallsToUpdateSelectedRole)
    }
  )
})
