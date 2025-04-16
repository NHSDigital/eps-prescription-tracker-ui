import {AxiosInstance} from "axios"
import {Logger} from "@aws-lambda-powertools/logger"

import {patientDetailsLookup} from "."

interface _client{
    axiosInstance: AxiosInstance,
    pdsEndpoint: string,
    logger: Logger
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

  // PatientDetailsLookup interface
  patientDetailsPath = (nhsNumber: string) =>
    patientDetailsLookup.utils.PATIENT_DETAILS_PATH(this.pdsEndpoint, nhsNumber)
  getPatientDetails = (nhsNumber: string) => patientDetailsLookup.interaction(this, nhsNumber)
}
