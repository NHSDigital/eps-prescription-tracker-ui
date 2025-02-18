import {jest} from "@jest/globals"
import jwksClient from "jwks-rsa"

import {DynamoDBDocumentClient, DeleteCommand} from "@aws-sdk/lib-dynamodb"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"

process.env.MOCK_MODE_ENABLED = "true"

const mockGetUsernameFromEvent = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Mock_JoeBloggs"
  })

  return {
    getUsernameFromEvent
  }
})

const {handler} = await import("@/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"

jest.mock("@aws-sdk/lib-dynamodb")

describe("handler behaves as expected", () => {
  const logger = new Logger()
  const dynamoDBClient = new DynamoDBClient({})
  const documentClient = DynamoDBDocumentClient.from(dynamoDBClient)

  beforeEach(() => {
    jest.restoreAllMocks()

    // Mock the documentClient send method
    jest.spyOn(documentClient, "send").mockImplementation(() => Promise.resolve({$metadata: {httpStatusCode: 200}}))
  })

  it("Dummy test", async () => {
    console.log("Pass test")
  })

})
