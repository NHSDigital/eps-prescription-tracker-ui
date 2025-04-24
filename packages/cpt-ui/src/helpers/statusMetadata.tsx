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

import {STATUS_LABELS} from "@/constants/ui-strings/StatusLabels"
import {PRESCRIPTION_MESSAGES} from "@/constants/ui-strings/PrescriptionMessage"

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
  "0000": {color: "orange", label: STATUS_LABELS.prescription["0000"]},
  "0001": {color: "yellow", label: STATUS_LABELS.prescription["0001"]},
  "0002": {color: "purple", label: STATUS_LABELS.prescription["0002"]},
  "0003": {color: "blue", label: STATUS_LABELS.prescription["0003"]},
  "0004": {color: "white", label: STATUS_LABELS.prescription["0004"]},
  "0005": {color: "red", label: STATUS_LABELS.prescription["0005"]},
  "0006": {color: "green", label: STATUS_LABELS.prescription["0006"]},
  "0007": {color: "red", label: STATUS_LABELS.prescription["0007"]},
  "0008": {color: "grey", label: STATUS_LABELS.prescription["0008"]},
  "0009": {color: "pink", label: STATUS_LABELS.prescription["0009"]},
  "9000": {color: "aqua-green", label: STATUS_LABELS.prescription["9000"]},
  "9001": {color: "blue", label: STATUS_LABELS.prescription["9001"]},
  "9005": {color: "red", label: STATUS_LABELS.prescription["9005"]}
}

// --- Item-Level Status Codes ---
const itemStatusMap: Record<string, StatusMetadata> = {
  "0001": {color: "green", label: STATUS_LABELS.item["0001"]},
  "0002": {color: "orange", label: STATUS_LABELS.item["0002"]},
  "0003": {color: "blue", label: STATUS_LABELS.item["0003"]},
  "0004": {color: "blue", label: STATUS_LABELS.item["0004"]},
  "0005": {color: "red", label: STATUS_LABELS.item["0005"]},
  "0006": {color: "white", label: STATUS_LABELS.item["0006"]},
  "0007": {color: "yellow", label: STATUS_LABELS.item["0007"]},
  "0008": {color: "purple", label: STATUS_LABELS.item["0008"]}
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

// --- Accessors: Message History ---
/**
 * Returns a human-readable heading for a CPTS message history event.
 * Falls back to the original heading if no match is found.
 */
export const getMessageHistoryHeader = (heading: string): string =>
  PRESCRIPTION_MESSAGES[heading] ?? heading

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
