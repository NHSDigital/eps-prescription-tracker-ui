/**
 * Centralised status metadata utility for the EPS UI.
 *
 * This module provides a single source of truth for interpreting and presenting
 * prescription and item-level EPS status codes throughout the application.
 *
 * Exported functions support:
 * - UI tag colouring and labelling
 * - Status descriptions in summaries
 * - Repeat prescription formatting
 *
 * Used across multiple components for consistent styling and display logic.
 */

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
  label: string
}

// --- Prescription-Level Status Codes ---
const prescriptionStatusMap: Record<string, StatusMetadata> = {
  "0000": {color: "orange", label: "Next repeat ready to download"},
  "0001": {color: "yellow", label: "Available to download"},
  "0002": {color: "purple", label: "Downloaded by a dispenser"},
  "0003": {color: "blue", label: "Some items dispensed"},
  "0004": {color: "white", label: "Expired"},
  "0005": {color: "red", label: "Cancelled"},
  "0006": {color: "green", label: "All items dispensed"},
  "0007": {color: "red", label: "Not dispensed"},
  "0008": {color: "grey", label: "Claimed"},
  "0009": {color: "pink", label: "Not claimed"},
  "9000": {color: "aqua-green", label: "Future eRD issue"},
  "9001": {color: "blue", label: "Future issue date dispense"},
  "9005": {color: "red", label: "Future prescription cancelled"}
}

// --- Item-Level Status Codes ---
const itemStatusMap: Record<string, StatusMetadata> = {
  "0001": {color: "green", label: "Item fully dispensed"},
  "0002": {color: "orange", label: "Item not dispensed"},
  "0003": {color: "blue", label: "Item dispensed - partial"},
  "0004": {color: "blue", label: "Item not dispensed - owing"},
  "0005": {color: "red", label: "Item cancelled"},
  "0006": {color: "white", label: "Item expired"},
  "0007": {color: "yellow", label: "Item to be dispensed"},
  "0008": {color: "purple", label: "Item with dispenser"}
}

// --- Accessors: Prescription-Level ---
export const getStatusTagColour = (code: string): TagColour =>
  prescriptionStatusMap[code]?.color ?? "red"

export const getStatusDisplayText = (code: string): string =>
  prescriptionStatusMap[code]?.label ?? "Unknown"

// --- Accessors: Item-Level ---
export const getItemStatusTagColour = (code: string): TagColour =>
  itemStatusMap[code]?.color ?? "red"

export const getItemStatusDisplayText = (code: string): string =>
  itemStatusMap[code]?.label ?? "Unknown"

// --- Formatter: Prescription Type ---
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
