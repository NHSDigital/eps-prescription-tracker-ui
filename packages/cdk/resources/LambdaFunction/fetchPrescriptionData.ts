import {APIGatewayProxyHandler} from "aws-lambda"
import axios from "axios"
import {DynamoDB} from "aws-sdk"

const APIGEE_BASE_URL = process.env.APIGEE_BASE_URL || "https://internal-dev.api.service.nhs.uk"
const TABLE_NAME = process.env.TABLE_NAME || "DefaultTableName"
const TOKEN_KEY = "apigeeAccessToken"

const dynamoDb = new DynamoDB.DocumentClient()

/**
 * Helper function to fetch or refresh the token from DynamoDB.
 * @returns {Promise<string>} The access token.
 */
async function getToken(): Promise<string> {
  // Fetch token from DynamoDB
  const result = await dynamoDb.get({
    TableName: TABLE_NAME,
    Key: {id: TOKEN_KEY}
  }).promise()

  const tokenData = result.Item

  // Check if a valid token exists
  if (tokenData && tokenData.expiry > Date.now()) {
    return tokenData.token
  }

  // Otherwise, generate a new token
  const newToken = await generateNewToken()
  const expiryTime = Date.now() + 60 * 60 * 1000 // 1 hour expiry

  // Store the new token in DynamoDB
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: {
      id: TOKEN_KEY,
      token: newToken,
      expiry: expiryTime
    }
  }).promise()

  return newToken
}

/**
 * Generate a new access token.
 * This could be a call to a secondary Lambda or an external provider.
 * @returns {Promise<string>} The generated token.
 */
async function generateNewToken(): Promise<string> {
  // Placeholder for actual token generation logic
  return "new-generated-token"
}

/**
 * Lambda function handler to fetch prescription data.
 * @param event The API Gateway request event.
 * @returns {Promise<any>} The response from Apigee.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const prescriptionId = event.pathParameters?.id

  if (!prescriptionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({error: "Prescription ID is required"})
    }
  }

  try {
    const token = await getToken()

    const url = `${APIGEE_BASE_URL}/clinical-prescription-tracker/${prescriptionId}`
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    }
  } catch (error) {
    console.error("Error fetching prescription data:", error)

    const errorMessage = error.response
      ? `Apigee responded with ${error.response.status}: ${error.response.statusText}`
      : "Unexpected error occurred while fetching data"

    return {
      statusCode: 500,
      body: JSON.stringify({error: errorMessage})
    }
  }
}
