import {FamilyName, DateOfBirth, Postcode} from "./types"

export const PATIENT_DETAILS_PATH = (
  url: string,
  familyName: FamilyName,
  dateOfBirth: DateOfBirth,
  postcode: Postcode
) =>{
  return `${url}/Patient`
    +`?family=${familyName.to_query_string()}`
    +`&birthdate=eq${dateOfBirth.to_query_string()}`
    +`&address-postalcode=${postcode.to_query_string()}`
}
