
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {TrackerUserInfo, fetchCachedUserInfo, updateCachedUserInfo} from "../src/userInfo"

jest.mock("@aws-sdk/lib-dynamodb")

describe("updateCachedUserInfo", () => {
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
    await updateCachedUserInfo(username, data, documentClient, logger, "dummyTable")

    // Expect successful call to DynamoDB
    expect(documentClient.send).toHaveBeenCalled()
  })

  it("should throw an error when TokenMappingTableName is not set", async () => {
    await expect(
      updateCachedUserInfo(username, data, documentClient, logger, "")
    ).rejects.toThrow("Token mapping table name not set")

    expect(documentClient.send).not.toHaveBeenCalled()
  })

  it("should handle DynamoDB update errors", async () => {
    // This is async
    jest.spyOn(documentClient, "send").mockImplementation(() => Promise.reject(
      new Error("Error adding user roles to DynamoDB"))
    )

    await expect(
      updateCachedUserInfo(username, data, documentClient, logger, "dummyTable")
    ).rejects.toThrow("Error adding user roles to DynamoDB")
  })
})

describe("fetchCachedUserInfo", () => {
  const logger = new Logger()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSend = jest.fn() as jest.MockedFunction<(command: GetCommand) => Promise<{Item?: any}>>

  const documentClient = {
    send: mockSend
  } as unknown as DynamoDBDocumentClient

  const username = "testUser"
  const tokenMappingTableName = "dummyTable"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should fetch user roles and user details from DynamoDB", async () => {
    const mockResponse = {
      Item: {
        rolesWithAccess: [
          {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: undefined,
        userDetails: {family_name: "Doe", given_name: "John"}
      }
    }

    mockSend.mockResolvedValueOnce(mockResponse as never)

    const result = await fetchCachedUserInfo(username, documentClient, logger, tokenMappingTableName)

    expect(result).toEqual({
      roles_with_access: [
        {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
      ],
      roles_without_access: [],
      currently_selected_role: undefined,
      user_details: {family_name: "Doe", given_name: "John"}
    })

    expect(mockSend).toHaveBeenCalled()
  })

  it("should throw an error when DynamoDB retrieval fails", async () => {
    mockSend.mockRejectedValue(new Error("DynamoDB error"))

    await expect(fetchCachedUserInfo(username, documentClient, logger, tokenMappingTableName)).rejects.toThrow(
      "Failed to retrieve user info from cache"
    )

    expect(mockSend).toHaveBeenCalled()
  })

  it("should handle case when some attributes are missing in DynamoDB response", async () => {
    const mockResponse = {
      Item: {
        rolesWithAccess: [
          {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: undefined,
        userDetails: {family_name: "Doe", given_name: "John"}
      }
    }

    mockSend.mockResolvedValueOnce(mockResponse as never)

    const result = await fetchCachedUserInfo(username, documentClient, logger, tokenMappingTableName)

    expect(result).toEqual({
      roles_with_access: [
        {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
      ],
      roles_without_access: [],
      currently_selected_role: undefined,
      user_details: {family_name: "Doe", given_name: "John"}
    })
  })

  it("should return default user details if missing in DynamoDB", async () => {
    const mockResponse = {
      Item: {
        rolesWithAccess: [],
        rolesWithoutAccess: [],
        currentlySelectedRole: undefined
        // userDetails is missing
      }
    }

    mockSend.mockResolvedValueOnce(mockResponse as never)

    const result = await fetchCachedUserInfo(username, documentClient, logger, tokenMappingTableName)

    expect(result).toEqual({
      roles_with_access: [],
      roles_without_access: [],
      currently_selected_role: undefined,
      user_details: {family_name: "", given_name: ""}
    })

    expect(mockSend).toHaveBeenCalled()
  })
})
