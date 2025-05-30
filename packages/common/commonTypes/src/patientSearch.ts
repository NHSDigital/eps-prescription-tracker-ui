export enum PatientSummaryGender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  UNKNOWN = "unknown"
}

export interface PatientSummary {
  familyName: string
  givenName?: Array<string>
  gender: PatientSummaryGender
  dateOfBirth: string
  address?: Array<string>
  postcode?: string
  nhsNumber: string
}
