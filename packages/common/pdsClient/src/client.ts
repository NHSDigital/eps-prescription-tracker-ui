import {AxiosInstance} from "axios"
import {Logger} from "@aws-lambda-powertools/logger"

import {patientDetails, patientSearch, axios} from "."
import {Client as clientInterface} from "./interface"

export class Client implements clientInterface, patientDetails.Interface, patientSearch.Interface {
  // Client interface
  readonly axiosInstance: AxiosInstance
  readonly pdsEndpoint: URL
  readonly logger: Logger
  apigeeAccessToken?: string
  roleId?: string
  orgCode?: string
  correlationId?: string

  constructor(
    axiosInstance: AxiosInstance,
    pdsEndpoint: URL,
    logger: Logger
  ){
    this.axiosInstance = axiosInstance
    this.pdsEndpoint = pdsEndpoint
    this.logger = logger
    this.apigeeAccessToken = undefined
    this.roleId = undefined
    this.orgCode = undefined
    this.correlationId = undefined
  }

  axios_get = async (
    url: URL,
    additionalLogParams: Record<string, string> = {}
  )=>
    axios.axios_get(this, url, additionalLogParams)

  headers = () => {
    return {
      Accept: "application/fhir+json",
      Authorization: `Bearer ${this.apigeeAccessToken}`,
      "NHSD-End-User-Organisation-ODS": this.orgCode!,
      "NHSD-Session-URID": this.roleId!,
      "x-Request-ID": crypto.randomUUID(),
      "X-Correlation-ID": this.correlationId!
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

  with_org_code(orgCode: string): this {
    this.orgCode = orgCode
    return this
  }

  with_correlation_id(correlationId: string): this {
    this.correlationId = correlationId
    return this
  }

  // PatientDetailsLookup interface
  patientDetailsPath = (nhsNumber: string) =>
    patientDetails.utils.PATIENT_DETAILS_PATH(this.pdsEndpoint, nhsNumber)
  getPatientDetails = (nhsNumber: string) => patientDetails.interaction(this, nhsNumber)

  // PatientSearch interface
  patientSearchPath = (
    searchParameters: patientSearch.types.PatientSearchParameters
  ) =>
    patientSearch.utils.PATIENT_SEARCH_PATH(this.pdsEndpoint, searchParameters)
  patientSearch = (
    familyName: string,
    dateOfBirth: string,
    postcode?: string,
    givenName?: string
  ) => patientSearch.interaction(
    this,
    familyName,
    dateOfBirth,
    postcode,
    givenName
  )
}
