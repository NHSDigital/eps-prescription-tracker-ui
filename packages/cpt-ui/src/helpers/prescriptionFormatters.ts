export type TagColour =
  | "green"
  | "red"
  | "orange"
  | "yellow"
  | "purple"
  | "blue"
  | "grey"
  | "pink"
  | "aqua-green"
  | "white"

export type StatusCategory = "dispensed" | "prescribed" | "other"

type StatusMetadata = {
  color: TagColour
  category: StatusCategory
  label: string
}

// --- Prescription-Level Status Codes (Spine) ---
const prescriptionStatusMap: Record<string, StatusMetadata> = {
  "0000": {color: "orange", category: "other", label: "Next repeat ready to download"},
  "0001": {color: "yellow", category: "other", label: "Available to download"},
  "0002": {color: "purple", category: "other", label: "Downloaded by a dispenser"},
  "0003": {color: "blue", category: "dispensed", label: "Some items dispensed"},
  "0004": {color: "white", category: "prescribed", label: "Expired"},
  "0005": {color: "red", category: "prescribed", label: "Cancelled"},
  "0006": {color: "green", category: "dispensed", label: "All items dispensed"},
  "0007": {color: "red", category: "prescribed", label: "Not dispensed"},
  "0008": {color: "grey", category: "other", label: "Claimed"},
  "0009": {color: "pink", category: "other", label: "Not claimed"},
  "9000": {color: "aqua-green", category: "other", label: "Future eRD issue"},
  "9001": {color: "blue", category: "other", label: "Future issue date dispense"},
  "9005": {color: "red", category: "prescribed", label: "Future prescription cancelled"}
}

// --- Item-Level Status Codes ---
const itemStatusMap: Record<string, StatusMetadata> = {
  "0001": {color: "green", category: "dispensed", label: "Item fully dispensed"},
  "0002": {color: "orange", category: "prescribed", label: "Item not dispensed"},
  "0003": {color: "blue", category: "dispensed", label: "Item dispensed - partial"},
  "0004": {color: "blue", category: "prescribed", label: "Item not dispensed - owing"},
  "0005": {color: "red", category: "prescribed", label: "Item cancelled"},
  "0006": {color: "white", category: "prescribed", label: "Item expired"},
  "0007": {color: "yellow", category: "prescribed", label: "Item to be dispensed"},
  "0008": {color: "purple", category: "prescribed", label: "Item with dispenser"}
}

// --- Public Accessors ---

// For prescription-level statuses
export const getStatusTagColour = (code: string): TagColour =>
  prescriptionStatusMap[code]?.color ?? "red"

export const getStatusDisplayText = (code: string): string =>
  prescriptionStatusMap[code]?.label ?? "Unknown"

export const getStatusCategory = (code: string): StatusCategory | undefined =>
  prescriptionStatusMap[code]?.category

// For item-level statuses
export const getItemStatusTagColour = (code: string): TagColour =>
  itemStatusMap[code]?.color ?? "red"

export const getItemStatusDisplayText = (code: string): string =>
  itemStatusMap[code]?.label ?? "Unknown"

export const getItemStatusCategory = (code: string): StatusCategory | undefined =>
  itemStatusMap[code]?.category

// --- Prescription Type Formatter ---
export const getPrescriptionTypeDisplayText = (
  prescriptionType: string,
  instanceNumber?: number,
  maxRepeats?: number
): string => {
  switch (prescriptionType) {
    case "0001":
      return "Acute"
    case "0002":
      return instanceNumber && maxRepeats ? `Repeat ${instanceNumber} of ${maxRepeats}` : "Repeat"
    case "0003":
      return instanceNumber && maxRepeats ? `eRD ${instanceNumber} of ${maxRepeats}` : "eRD"
    default:
      return "Unknown"
  }
}
