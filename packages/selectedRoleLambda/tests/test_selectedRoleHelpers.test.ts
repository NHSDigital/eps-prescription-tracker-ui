import {jest} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {updateDynamoTable} from "@/selectedRoleHelpers"
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
  }
}

// Mock OIDC Token Verification
const mockVerifyIdToken = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", async () => {
  const verifyIdToken = mockVerifyIdToken.mockImplementation(async () => {
    return {
      selected_roleid: "123"
    }
  })

  return {
    __esModule: true,
    verifyIdToken: verifyIdToken
  }
})

describe("updateDynamoTable", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should update DynamoDB with user selected role successfully", async () => {
    await updateDynamoTable(username, mockRoleData, dynamoDBClient, logger, tokenMappingTableName)
    expect(dynamoDBClient.send).toHaveBeenCalled()
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
