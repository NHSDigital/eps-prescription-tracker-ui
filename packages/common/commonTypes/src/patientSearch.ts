export enum PatientSummaryGender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  UNKNOWN = "unknown"
}
type PatientSummaryGenderUnion = `${PatientSummaryGender}`

export enum PatientNameUse {
  USUAL = "usual",
  TEMP = "temp",
  NICKNAME = "nickname",
  OLD = "old",
  MAIDEN = "maiden"
}
type PatientNameUseUnion = `${PatientNameUse}`

export enum PatientAddressUse {
  HOME = "home",
  TEMP = "temp",
  BILLING = "billing",
  WORK = "work"
}
type PatientAddressUseUnion = `${PatientAddressUse}`
export const NOT_AVAILABLE = "n/a"

export interface PatientSummary {
  nhsNumber: string
  gender?: PatientSummaryGenderUnion | typeof NOT_AVAILABLE
  dateOfBirth?: string
  familyName?: string
  givenName?: Array<string> | typeof NOT_AVAILABLE
  nameUse?: PatientNameUseUnion | typeof NOT_AVAILABLE
  address?: Array<string> | typeof NOT_AVAILABLE
  postcode?: string
  addressUse?: PatientAddressUseUnion | typeof NOT_AVAILABLE
}
