import {Outcome} from "./interaction"
import {FamilyName, DateOfBirth, Postcode} from "./types"

export interface Interface {
  patientSearch(
    familyName: string,
    dateOfBirth: string,
    postcode: string,
  ): Promise<Outcome>;
  patientSearchPath(
    familyName: FamilyName,
    dateOfBirth: DateOfBirth,
    postcode: Postcode
  ): string;
}
