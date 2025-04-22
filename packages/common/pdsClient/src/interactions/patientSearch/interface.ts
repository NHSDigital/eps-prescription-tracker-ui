import {Outcome} from "./interaction"
import {PatientSearchParameters} from "./types"

export interface Interface {
  patientSearch(
    familyName: string,
    dateOfBirth: string,
    postcode: string,
  ): Promise<Outcome>;
  patientSearchPath(
    searchParameters: PatientSearchParameters
  ): string;
}
