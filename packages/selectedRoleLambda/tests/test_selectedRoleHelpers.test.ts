import {jest} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {SelectedRole} from "@/selectedRoleTypes"

const getTokenMapping = jest.fn()
const updateTokenMapping = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    updateTokenMapping,
    getTokenMapping
  }
})

const {updateDynamoTable, fetchUserRolesFromDynamoDB} = await import("../src/selectedRoleHelpers")
// Mock Logger
const logger = new Logger()
jest.spyOn(logger, "info")
jest.spyOn(logger, "warn")
jest.spyOn(logger, "error")

// Properly initializing the DynamoDB client
const dynamoClient = new DynamoDBClient({})
const dynamoDBClient = DynamoDBDocumentClient.from(dynamoClient)

const username = "testUser"
const tokenMappingTableName = "dummyTable"

const mockRoleData: SelectedRole = {
  rolesWithAccess: [
    {
      role_name: "Doctor",
      role_id: "123",
      org_code: "ABC",
      org_name: "Test Hospital"
    }
  ],
  currentlySelectedRole: {
    role_name: "Doctor",
    role_id: "123",
    org_code: "ABC",
    org_name: "Test Hospital"
  },
  selectedRoleId: "123"
}

describe("updateDynamoTable", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should update DynamoDB with user selected role successfully", async () => {
    await updateDynamoTable(username, mockRoleData, dynamoDBClient, logger, tokenMappingTableName)

    expect(updateTokenMapping).toHaveBeenCalled()
  })

  it("should ensure no undefined values are stored in DynamoDB", async () => {
    const incompleteRoleData: SelectedRole = {
      // Ensuring an empty array instead of undefined
      rolesWithAccess: undefined as unknown as [],
      // Ensuring an empty object instead of undefined
      currentlySelectedRole: undefined as unknown as Record<string, never>,
      // Ensuring an empty string instead of undefined
      selectedRoleId: undefined as unknown as string
    }

    // Call the function with incomplete role data
    await updateDynamoTable(username, incompleteRoleData, dynamoDBClient, logger, tokenMappingTableName)

    // Verify that the logger captured the correct transformation of data
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Prepared role data for DynamoDB update"),
      expect.objectContaining({
        currentlySelectedRole: {}, // Should be set to an empty object
        rolesWithAccess: [], // Should be set to an empty array
        selectedRoleId: "" // Should be set to an empty string
      })
    )

    expect(updateTokenMapping).toHaveBeenCalled()
  })

  it("should throw an error when tokenMappingTableName is not set", async () => {
    await expect(
      updateDynamoTable(username, mockRoleData, dynamoDBClient, logger, "")
    ).rejects.toThrow("Token mapping table name not set")
    expect(updateTokenMapping).not.toHaveBeenCalled()
  })

  it("should handle DynamoDB update errors", async () => {
    updateTokenMapping.mockImplementationOnce(() => Promise.reject(new Error("DynamoDB update failed")))

    await expect(
      updateDynamoTable(username, mockRoleData, dynamoDBClient, logger, tokenMappingTableName)
    ).rejects.toThrow("DynamoDB update failed")

    expect(logger.error).toHaveBeenCalledWith(
      "Error updating user's selected role in DynamoDB",
      expect.objectContaining({
        username,
        errorMessage: "DynamoDB update failed",
        errorStack: expect.any(String)
      })
    )
  })

})

describe("fetchUserRolesFromDynamoDB", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(logger, "info").mockImplementation(() => {})
    jest.spyOn(logger, "warn").mockImplementation(() => {})
    jest.spyOn(logger, "error").mockImplementation(() => {})
  })

  it("should successfully fetch roles with access from DynamoDB", async () => {
    const tokenItem = {
      rolesWithAccess: [
        {role_name: "Nurse", role_id: "456", org_code: "XYZ", org_name: "Clinic A"},
        {role_name: "Surgeon", role_id: "789", org_code: "DEF", org_name: "Hospital B"}
      ]
    }
    getTokenMapping.mockImplementationOnce(() => Promise.resolve(tokenItem))

    const result = await fetchUserRolesFromDynamoDB(username, dynamoDBClient, logger, tokenMappingTableName)

    expect(logger.info).toHaveBeenCalledWith(
      "Roles and selected role successfully retrieved from DynamoDB",
      expect.objectContaining({data: expect.any(Object)})
    )

    expect(result).toEqual({
      rolesWithAccess: tokenItem.rolesWithAccess
    })
  })

  it("should return an empty array if no user data is found in DynamoDB", async () => {
    const tokenItem = {
      rolesWithAccess: []
    }
    getTokenMapping.mockImplementationOnce(() => Promise.resolve(tokenItem))

    const result = await fetchUserRolesFromDynamoDB(username, dynamoDBClient, logger, tokenMappingTableName)

    expect(result).toEqual({rolesWithAccess: []})
  })

  it("should throw an error if DynamoDB request fails", async () => {
    jest.spyOn(dynamoDBClient, "send").mockRejectedValueOnce(new Error("DynamoDB fetch error") as never)

    await expect(
      fetchUserRolesFromDynamoDB(username, dynamoDBClient, logger, tokenMappingTableName)
    ).rejects.toThrow("Failed to retrieve user info from cache")

    expect(logger.error).toHaveBeenCalledWith(
      "Error fetching user info from DynamoDB",
      expect.objectContaining({error: expect.any(Error)})
    )
  })
})
