import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import errorHandler from "@nhs/fhir-middy-error-handler"

const logger = new Logger({serviceName: "jwks"})

/* eslint-disable  max-len */

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} _event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const lambdaHandler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  const jwksBody = {
    "keys": [
      {
        "kty": "RSA",
        "n": "tZ5tsAzhfGWDSZ4AOObRUvwtEuWu16U1Pcad2jpO8VZ626NQTdfHNCLA7tKUMMQlZIFbfXZNzmAcCGryd2AoqgNeC6Glb64rZjD_TNsGxDjxBY-n3KUqx49I1-CM7eS0WKKNJkB_6ntosG_3Q-1_VSaz16d_Y97AS5NFRCcyTpJVOAPCBESkgKaEMZ1ocJzwI1OCsn1pmRQ4SKN9a-EOeBP3itD89-gfroBW_sCvcung2Q3_c0cO-ZZdE27WXWWy73TxA_UK9cwpTL8LDYMXWNLs0F6CDR7bBzxxcOSn6vKCilFe6dIo4-BQXZcPzJXBTS3oX6GNaYJ1C-3EMOO90L5lPTi8h-GQ1nZT3YycD21kEjqFYx-tbfymoUkdOZym9pRQEvYb2ww_GGkj66qmBFMz5HLCaWClkiE_l7K2gbk62EVykOlj1-41b-xM00onBqjprNkYbx7D7XZjdaSah3yy2kZDXvMea7Gyh3zN3K_Hm0tkUuCPx2tEaLhenPauLZB9rlQ-SXihWKh3FGQz5EuzO85htSmmXRl4YRfwDD2qJR-ZNqJ-YYTzN1ERCMbSoJ3Q-ETAA_hfBPR5UK2QMsn2SnWFQpgOeFKVsrK57wZNvszuifP12UavDF9f9ZfMjNL2_2aH-W7NECYRT7-ZVAd5pYXdfeQswZkmDEV4i7k",
        "e": "AQAB",
        "alg": "RS512",
        "kid": "eps-cpt-ui-test",
        "use": "sig"
      }
    ]
  }

  return {
    statusCode: 200,
    body: JSON.stringify(jwksBody),
    headers: {
      "Content-Type": "application/json"
    }
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(errorHandler({logger: logger}))
