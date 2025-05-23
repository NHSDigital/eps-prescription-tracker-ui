import {LambdaClient, InvokeCommand, InvocationType} from "@aws-sdk/client-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyResult} from "aws-lambda"

export const invokeClinicalViewLambda = async (
  prescriptionId: string,
  requestHeaders: Record<string, string>,
  logger: Logger
): Promise<APIGatewayProxyResult> => {
  const lambdaClient = new LambdaClient({region: "eu-west-2"})

  try {
    logger.info("Invoking clinicalView Lambda directly", {prescriptionId})

    const lambdaParams = {
      FunctionName: "cpt-pr-809-ClinicalView",
      InvocationType: InvocationType.RequestResponse,
      Payload: JSON.stringify({
        headers: requestHeaders,
        pathParameters: {
          prescriptionId
        }
      })
    }

    const command = new InvokeCommand(lambdaParams)
    const lambdaResponse = await lambdaClient.send(command)

    const responsePayload = JSON.parse(
      Buffer.from(lambdaResponse.Payload as Uint8Array).toString()
    )

    logger.info("Successfully fetched prescription details from clinicalView Lambda", {
      prescriptionId,
      data: responsePayload
    })

    return {
      statusCode: 200,
      body: JSON.stringify(responsePayload),
      headers: {
        "Content-Type": "application/json"
      }
    }
  } catch (error) {
    logger.error("Failed to invoke clinicalView Lambda", {error})
    return {
      statusCode: 500,
      body: JSON.stringify({message: "Error retrieving prescription details"})
    }
  }
}
