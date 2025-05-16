export interface PatientSummary {
  familyName: string
  givenName?: Array<string>
  gender: string
  dateOfBirth: string
  address?: Array<string>
  postcode?: string
  nhsNumber: string
}
