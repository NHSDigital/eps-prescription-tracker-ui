import {PatientSearchParameters} from "./types"

export const PATIENT_DETAILS_PATH = (
  url: string,
  searchParameters: PatientSearchParameters
) =>{
  return `${url}/Patient`
    +`?family=${searchParameters.familyName.to_query_string()}`
    +`&birthdate=eq${searchParameters.dateOfBirth.to_query_string()}`
    +`&address-postalcode=${searchParameters.postcode.to_query_string()}`
}
