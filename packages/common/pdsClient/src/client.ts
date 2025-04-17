import {AxiosInstance} from "axios"
import {Logger} from "@aws-lambda-powertools/logger"

import {patientDetailsLookup} from "."
import {axios_get as _axios_get, AxiosCallOutcome} from "axios_wrapper"

interface _client{
    axiosInstance: AxiosInstance,
    pdsEndpoint: string,
    logger: Logger,

    axios_get(url: string, headers: Record<string, string>): Promise<AxiosCallOutcome>
}

export class Client implements _client, patientDetailsLookup.Interface{
  // Client interface
  axiosInstance: AxiosInstance
  pdsEndpoint: string
  logger: Logger
  apigeeAccessToken: string
  roleId: string

  constructor(
    axiosInstance: AxiosInstance,
    pdsEndpoint: string,
    logger: Logger,
    apigeeAccessToken: string,
    roleId: string
  ){
    this.axiosInstance = axiosInstance
    this.pdsEndpoint = pdsEndpoint
    this.logger = logger
    this.apigeeAccessToken = apigeeAccessToken
    this.roleId = roleId
  }

  axios_get = async (
    url: string,
    headers: Record<string, string>,
    additionalLogParams: Record<string, string> = {}
  )=>
    _axios_get(this, url, headers, additionalLogParams)

  // PatientDetailsLookup interface
  patientDetailsPath = (nhsNumber: string) =>
    patientDetailsLookup.utils.PATIENT_DETAILS_PATH(this.pdsEndpoint, nhsNumber)
  getPatientDetails = (nhsNumber: string) => patientDetailsLookup.interaction(this, nhsNumber)
}
