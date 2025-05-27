import {AxiosInstance} from "axios"
import {v4 as uuidv4} from "uuid"
import {Logger} from "@aws-lambda-powertools/logger"

import {patientDetailsLookup, patientSearch, axios} from "."
import {Client as clientInterface} from "./interface"

export class Client implements clientInterface, patientDetailsLookup.Interface, patientSearch.Interface {
  // Client interface
  readonly axiosInstance: AxiosInstance
  readonly pdsEndpoint: string
  readonly logger: Logger
  apigeeAccessToken?: string
  roleId?: string

  constructor(
    axiosInstance: AxiosInstance,
    pdsEndpoint: string,
    logger: Logger
  ){
    this.axiosInstance = axiosInstance
    this.pdsEndpoint = pdsEndpoint
    this.logger = logger
    this.apigeeAccessToken = undefined
    this.roleId = undefined
  }

  axios_get = async (
    url: string,
    additionalLogParams: Record<string, string> = {}
  )=>
    axios.axios_get(this, url, additionalLogParams)

  headers = () => {
    return {
      Accept: "application/fhir+json",
      Authorization: this.apigeeAccessToken ? `Bearer ${this.apigeeAccessToken}` : "",
      "NHSD-End-User-Organisation-ODS": "A83008",
      "NHSD-Session-URID": this.roleId ?? "",
      "X-Request-ID": uuidv4(),
      "X-Correlation-ID": uuidv4()
    }
  }

  with_access_token(apigeeAccessToken: string): this {
    this.apigeeAccessToken = apigeeAccessToken
    return this
  }

  with_role_id(roleId: string): this {
    this.roleId = roleId
    return this
  }

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
    postcode: string,
    givenName?: string
  ) => patientSearch.interaction(
    this,
    familyName,
    dateOfBirth,
    postcode,
    givenName
  )
}
