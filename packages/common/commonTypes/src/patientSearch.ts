export enum PatientSummaryGender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  UNKNOWN = "unknown"
}

export const NOT_AVAILABLE = "n/a"

export interface PatientSummary {
  nhsNumber: string
  gender?: PatientSummaryGender | typeof NOT_AVAILABLE
  dateOfBirth?: string
  familyName?: string
  givenName?: Array<string> | typeof NOT_AVAILABLE
  address?: Array<string> | typeof NOT_AVAILABLE
  postcode?: string
}
