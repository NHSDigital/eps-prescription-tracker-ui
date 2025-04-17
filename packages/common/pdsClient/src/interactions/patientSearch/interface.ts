import {Outcome} from "./interaction"
import {familyName, dateOfBirth, postcode} from "./types"

export interface Interface {
  patientSearch(
    familyName: string,
    dateOfBirth: string,
    postcode: string,
  ): Promise<Outcome>;
  patientSearchPath(
    familyName: familyName,
    dateOfBirth: dateOfBirth,
    postcode: postcode
  ): string;
}
