import {jest} from "@jest/globals"

// Mock environment variables
process.env.MOCK_MODE_ENABLED = "false"

// Mocked functions
const mockGetUsernameFromEvent = jest.fn()
const mockUpdateDynamoTable = jest.fn()
const mockFetchDynamoRolesWithAccess = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    getUsernameFromEvent: mockGetUsernameFromEvent.mockImplementation(() => "Primary_JoeBloggs")
  }
})

jest.unstable_mockModule("@/selectedRoleHelpers", () => {
  const updateDynamoTable = mockUpdateDynamoTable.mockImplementation(() =>
    Promise.resolve()
  )

  const fetchDynamoRolesWithAccess = mockFetchDynamoRolesWithAccess.mockImplementation(() =>
    Promise.resolve({
      roles_with_access: [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
        {role_id: "456", org_code: "ABC", role_name: "MockRole_2"}
      ],
      currently_selected_role: undefined // Initially no role is selected
    })
  )

  return {
    updateDynamoTable,
    fetchDynamoRolesWithAccess
  }
})

const {handler} = await import("@/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

describe("Lambda Handler Tests with mock disabled", () => {
  let event = {...mockAPIGatewayProxyEvent, body: JSON.stringify({role_id: "123", org_code: "XYZ"})}
  let context = {...mockContext}

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return a successful response when called normally", async () => {
    const response = await handler(event, context)

    expect(mockGetUsernameFromEvent).toHaveBeenCalled()
    expect(mockUpdateDynamoTable).toHaveBeenCalledWith(
      "Primary_JoeBloggs",
      {
        currently_selected_role: {
          role_id: "123",
          org_code: "XYZ",
          role_name: "MockRole_1"
        }, // selected role is moved
        roles_with_access: [
          {
            role_id: "456",
            org_code: "ABC",
            role_name: "MockRole_2"
          }
        ]
      },
      expect.any(Object),
      expect.any(Object),
      expect.any(String)
    )
    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: "Selected role data has been updated successfully",
        userInfo: {
          currently_selected_role: {
            role_id: "123",
            org_code: "XYZ",
            role_name: "MockRole_1"
          },
          roles_with_access: [
            {
              role_id: "456",
              org_code: "ABC",
              role_name: "MockRole_2"
            }
          ]
        }
      })
    })
  })

  it("should return 400 when request body is missing", async () => {
    event.body = "" as unknown as string
    const response = await handler(event, context)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain("Request body is required")
  })

  it("should return 400 when request body is invalid JSON", async () => {
    event.body = "Invalid JSON"
    const response = await handler(event, context)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain("Invalid JSON format in request body")
  })
})
