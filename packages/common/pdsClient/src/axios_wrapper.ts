import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"

export enum AxiosCallOutcomeType {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export type AxiosCallOutcome =
// eslint-disable-next-line @typescript-eslint/no-explicit-any
| { type: AxiosCallOutcomeType.SUCCESS, data: any }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
| { type: AxiosCallOutcomeType.ERROR, error: any, timeMs: number }

export async function axios_get(
  axiosInstance: AxiosInstance,
  logger: Logger,
  url: string,
  headers: Record<string, string>,
  additionalLogParams: Record<string, string> = {}
): Promise<AxiosCallOutcome> {
  const startTime = Date.now()
  logger.info("Fetching patient details from PDS", additionalLogParams)

  let response
  try {
    response = await axiosInstance.get(url, {headers: headers})
  } catch (error) {
    return {type: AxiosCallOutcomeType.ERROR, error, timeMs: Date.now() - startTime}
  }

  logger.info("PDS response time", {
    timeMs: Date.now() - startTime,
    ...additionalLogParams
  })

  if(response.status !== 200){
    logger.warn("PDS response not OK", {
      status: response.status,
      statusText: response.statusText,
      ...additionalLogParams
    })
  }

  return {type: AxiosCallOutcomeType.SUCCESS, data: response.data}
}
