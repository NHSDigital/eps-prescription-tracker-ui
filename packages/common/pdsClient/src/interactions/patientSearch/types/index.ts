export * from "./name"
export * from "./dateOfBirth"
export * from "./postcode"

export enum ValidatedParameter{
  FAMILY_NAME = "familyName",
  GIVEN_NAME = "givenName",
  DATE_OF_BIRTH = "dateOfBirth",
  POSTCODE = "postcode"
}

import {DateOfBirth} from "./dateOfBirth"
import {Name} from "./name"
import {Postcode} from "./postcode"
export type PatientSearchParameters = {
  familyName: Name,
  givenName?: Name,
  dateOfBirth: DateOfBirth
  postcode: Postcode
}
