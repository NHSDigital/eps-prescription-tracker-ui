import {URL} from "url"
import {PatientSearchParameters} from "./types"

export function PATIENT_SEARCH_PATH(
  pds_base: URL,
  searchParameters: PatientSearchParameters
): URL {
  const url = new URL("Patient", pds_base)

  url.searchParams.set("family", searchParameters.familyName.to_string())
  url.searchParams.set("birthdate", `eq${searchParameters.dateOfBirth.to_string()}`)
  if (searchParameters.postcode) {
    url.searchParams.set("address-postalcode", searchParameters.postcode.to_string())
  }
  if (searchParameters.givenName) {
    url.searchParams.set("given", searchParameters.givenName.to_string())
  }

  return url
}
