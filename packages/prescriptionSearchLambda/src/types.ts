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
  name: {
    prefix?: string;
    given: string;
    family: string;
    suffix?: string;
  };
  gender?: string;
  dateOfBirth?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
  };
  supersededBy?: string;
}

export enum PrescriptionStatus {
  ACTIVE = "active",
  CLAIMED = "claimed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  FUTURE = "future",
}

export enum TreatmentType {
  ACUTE = "acute",
  REPEAT = "repeat",
  REPEAT_DISPENSING = "repeat-dispensing",
}

export interface SearchParams {
  prescriptionId?: string;
  nhsNumber?: string;
}

export interface PrescriptionSummary {
  prescriptionId: string;
  statusCode: string;
  issueDate: string;
  prescriptionTreatmentType: TreatmentType;
  prescriptionPendingCancellation: boolean;
  itemsPendingCancellation: number;
  prescribedFrom: "England" | "Wales" | "Unknown";
  nhsNumber: string;
}

export interface SearchResponse {
  patient: PatientDetails;
  prescriptions: {
    current: Array<PrescriptionSummary>;
    future: Array<PrescriptionSummary>;
    claimedAndExpired: Array<PrescriptionSummary>;
  };
}
