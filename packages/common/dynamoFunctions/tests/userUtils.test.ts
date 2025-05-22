import {jest} from "@jest/globals"
// eslint-disable-next-line max-len
import {removeRoleCategories, extractRoleInformation, UserInfoResponse} from "../src/userUtils" // Update this path to match your project structure

// Mock the Logger
const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

import {Logger} from "@aws-lambda-powertools/logger"

describe("removeRoleCategories", () => {
  test("should extract the role name from a categorized string", () => {
    const input = '"category":"subcategory":"roleName"'
    const expected = "roleName"
    expect(removeRoleCategories(input)).toBe(expected)
  })

  test("should return the same string when no categories are present", () => {
    const input = "simpleName"
    expect(removeRoleCategories(input)).toBe("simpleName")
  })

  test("should handle undefined input", () => {
    expect(removeRoleCategories(undefined)).toBeUndefined()
  })

  test("should remove all quotes from the extracted name", () => {
    const input = '"Admin":"User":"Super"User"'
    const expected = "SuperUser"
    expect(removeRoleCategories(input)).toBe(expected)
  })
})

describe("extractRoleInformation", () => {

  beforeEach(() => {
    jest.clearAllMocks() // Clear mock calls between tests
  })

  test("should extract roles with access correctly", () => {
    // Mock user info data
    const mockUserInfo: UserInfoResponse = {
      sub: "123",
      name: "John Doe",
      family_name: "Doe",
      given_name: "John",
      uid: "jdoe",
      email: "john.doe@example.com",
      nhsid_useruid: "NHS123",
      nhsid_nrbac_roles: [
        {
          org_code: "ORG1",
          person_orgid: "PORG1",
          person_roleid: "ROLE1",
          role_code: "RC1",
          role_name: "Admin Role",
          activity_codes: ["B0570"] // Has access
        },
        {
          org_code: "ORG2",
          person_orgid: "PORG2",
          person_roleid: "ROLE2",
          role_code: "RC2",
          role_name: "User Role",
          activity_codes: ["OTHER"] // No access
        }
      ],
      nhsid_user_orgs: [
        {
          org_code: "ORG1",
          org_name: "Organization 1"
        },
        {
          org_code: "ORG2",
          org_name: "Organization 2"
        }
      ]
    }

    const selectedRoleId = ""
    const result = extractRoleInformation(mockUserInfo, selectedRoleId, mockLogger as Logger)

    // Verify the result structure
    expect(result).toHaveProperty("roles_with_access")
    expect(result).toHaveProperty("roles_without_access")
    expect(result).toHaveProperty("user_details")

    // Verify roles with access
    expect(result.roles_with_access).toHaveLength(1)
    expect(result.roles_with_access[0].role_name).toBe("Admin Role")
    expect(result.roles_with_access[0].org_name).toBe("Organization 1")

    // Verify roles without access
    expect(result.roles_without_access).toHaveLength(1)
    expect(result.roles_without_access[0].role_name).toBe("User Role")
    expect(result.roles_without_access[0].org_name).toBe("Organization 2")

    // Verify user details
    expect(result.user_details.family_name).toBe("Doe")
    expect(result.user_details.given_name).toBe("John")
  })

  test("should identify currently selected role when it has access", () => {
    const mockUserInfo: UserInfoResponse = {
      sub: "123",
      name: "John Doe",
      family_name: "Doe",
      given_name: "John",
      uid: "jdoe",
      email: "john.doe@example.com",
      nhsid_useruid: "NHS123",
      nhsid_nrbac_roles: [
        {
          org_code: "ORG1",
          person_orgid: "PORG1",
          person_roleid: "ROLE1",
          role_code: "RC1",
          role_name: "Admin Role",
          activity_codes: ["B0570"] // Has access
        }
      ],
      nhsid_user_orgs: [
        {
          org_code: "ORG1",
          org_name: "Organization 1"
        }
      ]
    }

    const selectedRoleId = "ROLE1"
    const result = extractRoleInformation(mockUserInfo, selectedRoleId, mockLogger as Logger)

    // Verify the currently selected role
    expect(result.currently_selected_role).toBeDefined()
    expect(result.currently_selected_role?.role_id).toBe("ROLE1")
    expect(result.currently_selected_role?.role_name).toBe("Admin Role")
  })

  test("should handle multiple accepted access codes", () => {
    const mockUserInfo: UserInfoResponse = {
      sub: "123",
      name: "John Doe",
      family_name: "Doe",
      given_name: "John",
      uid: "jdoe",
      email: "john.doe@example.com",
      nhsid_useruid: "NHS123",
      nhsid_nrbac_roles: [
        {
          org_code: "ORG1",
          person_orgid: "PORG1",
          person_roleid: "ROLE1",
          role_code: "RC1",
          role_name: "Admin Role",
          activity_codes: ["B0570"] // Has access
        },
        {
          org_code: "ORG2",
          person_orgid: "PORG2",
          person_roleid: "ROLE2",
          role_code: "RC2",
          role_name: "User Role",
          activity_codes: ["B0278"] // Also has access
        },
        {
          org_code: "ORG3",
          person_orgid: "PORG3",
          person_roleid: "ROLE3",
          role_code: "RC3",
          role_name: "Guest Role",
          activity_codes: ["OTHER"] // No access
        }
      ],
      nhsid_user_orgs: [
        {
          org_code: "ORG1",
          org_name: "Organization 1"
        },
        {
          org_code: "ORG2",
          org_name: "Organization 2"
        },
        {
          org_code: "ORG3",
          org_name: "Organization 3"
        }
      ]
    }

    const selectedRoleId = ""
    const result = extractRoleInformation(mockUserInfo, selectedRoleId, mockLogger as Logger)

    // Verify roles with access (should include both B0570 and B0278)
    expect(result.roles_with_access).toHaveLength(2)
    expect(result.roles_without_access).toHaveLength(1)
  })

  test("should handle missing nhsid_nrbac_roles", () => {
    const mockUserInfo: UserInfoResponse = {
      sub: "123",
      name: "John Doe",
      family_name: "Doe",
      given_name: "John",
      uid: "jdoe",
      email: "john.doe@example.com",
      nhsid_useruid: "NHS123",
      // No nhsid_nrbac_roles provided
      nhsid_user_orgs: [
        {
          org_code: "ORG1",
          org_name: "Organization 1"
        }
      ]
    }

    const selectedRoleId = ""
    const result = extractRoleInformation(mockUserInfo, selectedRoleId, mockLogger as Logger)

    // Should have empty arrays for roles
    expect(result.roles_with_access).toHaveLength(0)
    expect(result.roles_without_access).toHaveLength(0)
    expect(result.currently_selected_role).toBeUndefined()
  })

  test("should handle missing nhsid_user_orgs", () => {
    const mockUserInfo: UserInfoResponse = {
      sub: "123",
      name: "John Doe",
      family_name: "Doe",
      given_name: "John",
      uid: "jdoe",
      email: "john.doe@example.com",
      nhsid_useruid: "NHS123",
      nhsid_nrbac_roles: [
        {
          org_code: "ORG1",
          person_orgid: "PORG1",
          person_roleid: "ROLE1",
          role_code: "RC1",
          role_name: "Admin Role",
          activity_codes: ["B0570"]
        }
      ]
      // No nhsid_user_orgs provided
    }

    const selectedRoleId = ""
    const result = extractRoleInformation(mockUserInfo, selectedRoleId, mockLogger as Logger)

    // Should still process roles but org_name would be undefined
    expect(result.roles_with_access).toHaveLength(1)
    expect(result.roles_with_access[0].org_name).toBeUndefined()
  })

  test("should handle roles with missing required fields", () => {
    const mockUserInfo: UserInfoResponse = {
      sub: "123",
      name: "John Doe",
      family_name: "Doe",
      given_name: "John",
      uid: "jdoe",
      email: "john.doe@example.com",
      nhsid_useruid: "NHS123",
      nhsid_nrbac_roles: [
        {
          org_code: "", // Empty org_code
          person_orgid: "",
          person_roleid: "",
          role_code: "",
          role_name: "", // Empty role_name
          activity_codes: ["B0570"]
        },
        {
          org_code: "ORG2",
          person_orgid: "PORG2",
          person_roleid: "ROLE2",
          role_code: "RC2",
          role_name: "Valid Role",
          activity_codes: ["B0570"]
        }
      ],
      nhsid_user_orgs: []
    }

    const selectedRoleId = ""
    const result = extractRoleInformation(mockUserInfo, selectedRoleId, mockLogger as Logger)

    // Should skip the role with missing fields and only include the valid one
    expect(result.roles_with_access).toHaveLength(1)
    expect(result.roles_with_access[0].role_name).toBe("Valid Role")

    // Verify that the logger.warn was called for the invalid role
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Role does not meet minimum field requirements",
      expect.any(Object)
    )
  })

  test("should process categorized role names correctly", () => {
    const mockUserInfo: UserInfoResponse = {
      sub: "123",
      name: "John Doe",
      family_name: "Doe",
      given_name: "John",
      uid: "jdoe",
      email: "john.doe@example.com",
      nhsid_useruid: "NHS123",
      nhsid_nrbac_roles: [
        {
          org_code: "ORG1",
          person_orgid: "PORG1",
          person_roleid: "ROLE1",
          role_code: "RC1",
          role_name: '"Admin":"Level1":"Super Admin"',
          activity_codes: ["B0570"]
        }
      ],
      nhsid_user_orgs: [
        {
          org_code: "ORG1",
          org_name: "Organization 1"
        }
      ]
    }

    const selectedRoleId = ""
    const result = extractRoleInformation(mockUserInfo, selectedRoleId, mockLogger as Logger)

    // Should correctly process the categorized role name
    expect(result.roles_with_access).toHaveLength(1)
    expect(result.roles_with_access[0].role_name).toBe("Super Admin")
  })
})
