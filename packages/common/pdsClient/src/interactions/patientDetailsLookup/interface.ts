import {Outcome} from "./interaction"

export interface Interface {
  getPatientDetails(nhsNumber: string): Promise<Outcome>;
  patientDetailsPath(nhsNumber: string): string;
}
