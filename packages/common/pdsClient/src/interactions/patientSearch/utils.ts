import {PatientSearchParameters} from "./types"

export const PATIENT_DETAILS_PATH = (
  url: string,
  searchParameters: PatientSearchParameters
) =>{
  const base = `${url}/Patient`
  const familyQuery = `?family=${searchParameters.familyName.to_query_string()}`
  const birthdateQuery = `&birthdate=eq${searchParameters.dateOfBirth.to_query_string()}`
  const postcodeQuery = `&address-postalcode=${searchParameters.postcode.to_query_string()}`
  const givenNameQuery = `${searchParameters.givenName ? `&given=${searchParameters.givenName.to_query_string()}` : ""}`

  return `${base}${familyQuery}${birthdateQuery}${postcodeQuery}${givenNameQuery}`
}
