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

export interface PatientDetailsAddress {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
}

export interface PatientDetails {
  nhsNumber: string;
  prefix: string;
  suffix: string;
  given: string;
  family: string;
  gender: string | null;
  dateOfBirth: string | null;
  address: PatientDetailsAddress | null;
  supersededBy?: string;
}

export enum PrescriptionStatusCategories {
  CURRENT = "active",
  PAST = "past",
  FUTURE = "future",
}

export enum PrescriptionStatus {
  AWAITING_RELEASE_READY = "0000",
  TO_BE_DISPENSED = "0001",
  WITH_DISPENSER = "0002",
  WITH_DISPENSER_ACTIVE = "0003",
  EXPIRED = "0004",
  CANCELLED = "0005",
  DISPENSED = "0006",
  NOT_DISPENSED = "0007",
  CLAIMED = "0008",
  NO_CLAIMED = "0009",
  REPEAT_DISPENSE_FUTURE_INSTANCE = "9000",
  FUTURE_DATED_PRESCRIPTION = "9001",
  PENDING_CANCELLATION = "9005"
}

export const STATUS_CATEGORY_MAP: Record<PrescriptionStatus, PrescriptionStatusCategories> = {
  [PrescriptionStatus.AWAITING_RELEASE_READY]: PrescriptionStatusCategories.CURRENT,
  [PrescriptionStatus.TO_BE_DISPENSED]: PrescriptionStatusCategories.CURRENT,
  [PrescriptionStatus.WITH_DISPENSER]: PrescriptionStatusCategories.CURRENT,
  [PrescriptionStatus.WITH_DISPENSER_ACTIVE]: PrescriptionStatusCategories.CURRENT,
  [PrescriptionStatus.EXPIRED]: PrescriptionStatusCategories.PAST,
  [PrescriptionStatus.CANCELLED]: PrescriptionStatusCategories.PAST,
  [PrescriptionStatus.DISPENSED]: PrescriptionStatusCategories.PAST,
  [PrescriptionStatus.NOT_DISPENSED]: PrescriptionStatusCategories.PAST,
  [PrescriptionStatus.CLAIMED]: PrescriptionStatusCategories.PAST,
  [PrescriptionStatus.NO_CLAIMED]: PrescriptionStatusCategories.PAST,
  [PrescriptionStatus.REPEAT_DISPENSE_FUTURE_INSTANCE]: PrescriptionStatusCategories.FUTURE,
  [PrescriptionStatus.FUTURE_DATED_PRESCRIPTION]: PrescriptionStatusCategories.FUTURE,
  [PrescriptionStatus.PENDING_CANCELLATION]: PrescriptionStatusCategories.FUTURE
}

export const PRESCRIPTION_DISPLAY_LOOKUP: Record<PrescriptionStatus, string> = {
  [PrescriptionStatus.AWAITING_RELEASE_READY]: "Awaiting Release Ready",
  [PrescriptionStatus.TO_BE_DISPENSED]: "To Be Dispensed",
  [PrescriptionStatus.WITH_DISPENSER]: "With Dispenser",
  [PrescriptionStatus.WITH_DISPENSER_ACTIVE]: "With Dispenser - Active",
  [PrescriptionStatus.EXPIRED]: "Expired",
  [PrescriptionStatus.CANCELLED]: "Cancelled",
  [PrescriptionStatus.DISPENSED]: "Dispensed",
  [PrescriptionStatus.NOT_DISPENSED]: "Not Dispensed",
  [PrescriptionStatus.CLAIMED]: "Claimed",
  [PrescriptionStatus.NO_CLAIMED]: "No-Claimed",
  [PrescriptionStatus.REPEAT_DISPENSE_FUTURE_INSTANCE]: "Repeat Dispense future instance",
  [PrescriptionStatus.FUTURE_DATED_PRESCRIPTION]: "Prescription future instance",
  [PrescriptionStatus.PENDING_CANCELLATION]: "Cancelled future instance"
}

export const statusCodeMap: Record<string, string> = {
  [PrescriptionStatus.TO_BE_DISPENSED]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.TO_BE_DISPENSED],
  [PrescriptionStatus.WITH_DISPENSER]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.WITH_DISPENSER],
  [PrescriptionStatus.WITH_DISPENSER_ACTIVE]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.WITH_DISPENSER_ACTIVE],
  [PrescriptionStatus.EXPIRED]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.EXPIRED],
  [PrescriptionStatus.CANCELLED]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.CANCELLED],
  [PrescriptionStatus.DISPENSED]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.DISPENSED],
  [PrescriptionStatus.NOT_DISPENSED]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.NOT_DISPENSED],
  [PrescriptionStatus.CLAIMED]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.CLAIMED],
  [PrescriptionStatus.NO_CLAIMED]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.NO_CLAIMED],
  [PrescriptionStatus.REPEAT_DISPENSE_FUTURE_INSTANCE]:
  PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.REPEAT_DISPENSE_FUTURE_INSTANCE],
  [PrescriptionStatus.FUTURE_DATED_PRESCRIPTION]:
  PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.FUTURE_DATED_PRESCRIPTION],
  [PrescriptionStatus.PENDING_CANCELLATION]: PRESCRIPTION_DISPLAY_LOOKUP[PrescriptionStatus.PENDING_CANCELLATION]
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
