export const CANCELLATION_REASON_MAP: Record<string, string> = {
  "0001": "Prescribing Error",
  "0002": "Clinical contra-indication",
  "0003": "Change to medication treatment regime",
  "0004": "Clinical grounds",
  "0005": "At the Patients request",
  "0006": "At the Pharmacists request",
  "0007": "Notification of Death",
  "0008": "Patient deducted - other reason",
  "0009": "Patient deducted - registered with new practice"
} as const

export const NON_DISPENSING_REASON_MAP: Record<string, string> = {
  "0001": "Not required as instructed by the patient",
  "0002": "Clinically unsuitable",
  "0003": "Owings note issued to patient",
  "0004": "Prescription cancellation",
  "0005": "Prescription cancellation due to death",
  "0006": "Illegal NHS prescription",
  "0007": "Prescribed out of scope item",
  "0008": "Item or prescription expired",
  "0009": "Not allowed on FP10",
  "0010": "Patient did not collect medication",
  "0011": "Patient purchased medication over the counter"
} as const
