import {jest} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {updateDynamoTable, fetchDynamoRolesWithAccess} from "@/selectedRoleHelpers"
import {SelectedRole} from "@/selectedRoleTypes"

// Mock Logger
const logger = new Logger()
jest.spyOn(logger, "info")
jest.spyOn(logger, "error")

// Properly initializing the DynamoDB client
const dynamoClient = new DynamoDBClient({})
const dynamoDBClient = DynamoDBDocumentClient.from(dynamoClient)
jest.spyOn(dynamoDBClient, "send").mockImplementation(() => Promise.resolve({}))

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
    expect(dynamoDBClient.send).toHaveBeenCalledWith(expect.any(UpdateCommand))
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("DynamoDB update successful"),
      expect.any(Object)
    )
  })

  it("should throw an error when tokenMappingTableName is not set", async () => {
    await expect(
      updateDynamoTable(username, mockRoleData, dynamoDBClient, logger, "")
    ).rejects.toThrow("Token mapping table name not set")

    expect(dynamoDBClient.send).not.toHaveBeenCalled()
  })

  it("should handle DynamoDB update errors", async () => {
    jest.spyOn(dynamoDBClient, "send").mockRejectedValueOnce(new Error("DynamoDB update failed") as never)

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

describe("fetchDynamoRolesWithAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(logger, "info").mockImplementation(() => {}) // Mock logger.info
    jest.spyOn(logger, "warn").mockImplementation(() => {}) // Mock logger.warn
    jest.spyOn(logger, "error").mockImplementation(() => {}) // Mock logger.error
  })

  it("should successfully fetch roles with access from DynamoDB", async () => {
    // Mock a successful DynamoDB response
    const mockDynamoResponse = {
      Item: {
        rolesWithAccess: [
          {role_name: "Nurse", role_id: "456", org_code: "XYZ", org_name: "Clinic A"},
          {role_name: "Surgeon", role_id: "789", org_code: "DEF", org_name: "Hospital B"}
        ]
      }
    }

    jest.spyOn(dynamoDBClient, "send").mockResolvedValueOnce(mockDynamoResponse as never)

    const result = await fetchDynamoRolesWithAccess(username, dynamoDBClient, logger, tokenMappingTableName)

    expect(dynamoDBClient.send).toHaveBeenCalledWith(expect.any(GetCommand))
    expect(logger.info).toHaveBeenCalledWith(
      "Roles with access successfully retrieved from DynamoDB",
      expect.objectContaining({data: expect.any(Object)})
    )

    expect(result).toEqual({
      rolesWithAccess: mockDynamoResponse.Item.rolesWithAccess
    })
  })

  it("should return an empty array if no user data is found in DynamoDB", async () => {
    const mockEmptyResponse: {Item: undefined} = {Item: undefined}
    jest.spyOn(dynamoDBClient, "send").mockResolvedValueOnce(mockEmptyResponse as never)

    const result = await fetchDynamoRolesWithAccess(username, dynamoDBClient, logger, tokenMappingTableName)

    expect(logger.warn).toHaveBeenCalledWith("No user info found in DynamoDB", {username})
    expect(result).toEqual({rolesWithAccess: []})
  })

  it("should throw an error if DynamoDB request fails", async () => {
    jest.spyOn(dynamoDBClient, "send").mockRejectedValueOnce(new Error("DynamoDB fetch error") as never)

    await expect(
      fetchDynamoRolesWithAccess(username, dynamoDBClient, logger, tokenMappingTableName)
    ).rejects.toThrow("Failed to retrieve user info from cache")

    expect(logger.error).toHaveBeenCalledWith(
      "Error fetching user info from DynamoDB",
      expect.objectContaining({error: expect.any(Error)})
    )
  })
})
