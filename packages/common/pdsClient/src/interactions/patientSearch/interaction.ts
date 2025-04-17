/* eslint-disable @typescript-eslint/no-unused-vars */
import {Client} from "client"

enum PatientSearchOutcomeType {
  PLACEHOLDER = "PLACEHOLDER",
}

type PatientSearchOutcome =
  | { type: PatientSearchOutcomeType.PLACEHOLDER }

async function patientSearch(
  client: Client,
  familyName: string,
  dateOfBirth: string,
  postcode: string
): Promise<PatientSearchOutcome> {
  throw client
}

export {
  PatientSearchOutcome as Outcome,
  PatientSearchOutcomeType as OutcomeType,
  patientSearch
}
