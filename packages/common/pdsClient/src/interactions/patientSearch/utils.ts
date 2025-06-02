import {URL} from "url"
import {PatientSearchParameters} from "./types"

export function PATIENT_DETAILS_PATH(
  pds_base: URL,
  searchParameters: PatientSearchParameters
): URL {
  const url = new URL("Patient", pds_base)

  url.searchParams.set("family", searchParameters.familyName.to_query_string())
  url.searchParams.set("birthdate", `eq${searchParameters.dateOfBirth.to_query_string()}`)
  url.searchParams.set("address-postalcode", searchParameters.postcode.to_query_string())
  if (searchParameters.givenName) {
    url.searchParams.set("given", searchParameters.givenName.to_query_string())
  }

  return url
}

export function encodeQueryString(queryString: string): string {
  return queryString
    .replace("*", "%2A")
    .replace(" ", "%20")
}
