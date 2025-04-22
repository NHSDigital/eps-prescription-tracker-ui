export * from "./familyName"
export * from "./dateOfBirth"
export * from "./postcode"

export enum ValidatedParameter{
  FAMILY_NAME = "familyName",
  DATE_OF_BIRTH = "dateOfBirth",
  POSTCODE = "postcode"
}

import {DateOfBirth} from "./dateOfBirth"
import {FamilyName} from "./familyName"
import {Postcode} from "./postcode"
export type PatientSearchParameters = {
  familyName: FamilyName
  dateOfBirth: DateOfBirth
  postcode: Postcode
}
