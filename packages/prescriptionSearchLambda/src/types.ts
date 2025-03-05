import {RequestGroup} from "fhir/r4"

export interface PDSResponse {
  id: string;
  name?: Array<{
    given?: Array<string>;
    family?: string;
    prefix?: Array<string>;
    suffix?: Array<string>;
  }>;
  gender?: string;
  birthDate?: string;
  address?: Array<{
    line?: Array<string>;
    city?: string;
    postalCode?: string;
  }>;
  meta?: {
    security?: Array<{
      code: string;
    }>;
  };
}

export interface PatientDetails {
  nhsNumber: string;
  prefix: string;
  suffix: string;
  given: string;
  family: string;
  gender: string | null;
  dateOfBirth: string | null;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
  } | null;
  supersededBy?: string;
}

export enum PrescriptionStatus {
  ACTIVE = "active",
  CLAIMED = "claimed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  FUTURE = "future",
}

export const statusCodeMap: Record<string, string> = {
  "0001": "To be Dispensed",
  "0002": "With Dispenser",
  "0003": "With Dispenser - Active",
  "0004": PrescriptionStatus.EXPIRED,
  "0005": PrescriptionStatus.CANCELLED,
  "0006": PrescriptionStatus.CLAIMED,
  "0007": "Not Dispensed"
}

export enum TreatmentType {
    ACUTE = "0001",
    REPEAT = "0002",
    ERD = "0003"
  }

export interface SearchParams {
  prescriptionId?: string;
  nhsNumber?: string;
}

//TODO: optional issue number and optional max repeats, only if they are ERD
export interface PrescriptionAPIResponse {
  prescriptionId: string;
  statusCode: string;
  issueDate: string;
  prescriptionTreatmentType: TreatmentType;
  issueNumber?: number;
  maxRepeats?: number;
  prescriptionPendingCancellation: boolean;
  itemsPendingCancellation: boolean;
  nhsNumber?: number
}

export interface PatientAPIResponse extends PatientDetails {
  _pdsError?: Error
}

export type PrescriptionSummary = Omit<PrescriptionAPIResponse, "nhsNumber">

export interface SearchResponse {
  patient: PatientDetails;
  currentPrescriptions: Array<PrescriptionSummary>;
  futurePrescriptions: Array<PrescriptionSummary>;
  pastPrescriptions: Array<PrescriptionSummary>;
}

export interface IntentMap {
  [key: string]: RequestGroup["intent"]
}
