import {AxiosInstance} from "axios"
import {Logger} from "@aws-lambda-powertools/logger"

import {patientDetailsLookup, patientSearch, axios} from "."

interface client{
    axiosInstance: AxiosInstance,
    pdsEndpoint: string,
    logger: Logger,

    axios_get(url: string, headers: Record<string, string>): Promise<axios.Outcome>
}

export class Client implements client, patientDetailsLookup.Interface, patientSearch.Interface {
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
    axios.axios_get(this, url, headers, additionalLogParams)

  // PatientDetailsLookup interface
  patientDetailsPath = (nhsNumber: string) =>
    patientDetailsLookup.utils.PATIENT_DETAILS_PATH(this.pdsEndpoint, nhsNumber)
  getPatientDetails = (nhsNumber: string) => patientDetailsLookup.interaction(this, nhsNumber)

  // PatientSearch interface
  patientSearchPath = (
    searchParameters: patientSearch.types.PatientSearchParameters
  ) => patientSearch.utils.PATIENT_DETAILS_PATH(
    this.pdsEndpoint,
    searchParameters
  )
  patientSearch = (
    familyName: string,
    dateOfBirth: string,
    postcode: string
  ) => patientSearch.interaction(
    this,
    familyName,
    dateOfBirth,
    postcode
  )
}
