import {PatientSummary} from "./patientSearch"

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

export interface SearchResponse {
  patient: PatientSummary | undefined
  patientFallback: boolean
  currentPrescriptions: Array<PrescriptionSummary>
  futurePrescriptions: Array<PrescriptionSummary>
  pastPrescriptions: Array<PrescriptionSummary>
}

export interface PrescriptionSummary {
  prescriptionId: string
  isDeleted: boolean
  statusCode: string
  issueDate: string
  prescriptionTreatmentType: TreatmentType
  issueNumber?: number
  maxRepeats?: number
  prescriptionPendingCancellation: boolean
  itemsPendingCancellation: boolean
  nhsNumber?: string
}

export enum TreatmentType {
  ACUTE = "0001",
  REPEAT = "0002",
  ERD = "0003"
}

export interface PrescriptionAPIResponse extends PrescriptionSummary {
  nhsNumber: string
  given?: Array<string>
  family?: string,
  prefix?: Array<string>
  suffix?: Array<string>
}
