import {jest} from "@jest/globals"

// Mock the uuid module to return a fixed value for test predictability.
jest.unstable_mockModule("uuid", () => ({
  v4: jest.fn(() => "test-uuid")
}))

// Define the interface explicitly
interface doHSResponse {
  value: Array<{ODSCode: string}>
}

const mockDoHSClient = jest.fn<() => Promise<doHSResponse>>()

jest.unstable_mockModule("@cpt-ui-common/doHSClient", () => {
  const doHSClient = mockDoHSClient.mockResolvedValue({
    value: [
      {
        ODSCode: "foobar"
      }
    ]
  })

  return {
    doHSClient
  }
})

// Import after mocking
const {buildApigeeHeaders} = await import("../src/utils/prescriptionService")

describe("buildApigeeHeaders", () => {
  it("should return correct headers given a token and roleId", () => {
    const apigeeAccessToken = "sampleToken"
    const roleId = "sampleRole"

    const expectedHeaders = {
      Authorization: `Bearer ${apigeeAccessToken}`,
      "nhsd-session-urid": roleId,
      "nhsd-organization-uuid": "A83008",
      "nhsd-identity-uuid": "123456123456",
      "nhsd-session-jobrole": "123456123456",
      "x-request-id": "test-uuid"
    }

    const headers = buildApigeeHeaders(apigeeAccessToken, roleId)
    expect(headers).toEqual(expectedHeaders)
  })
})
