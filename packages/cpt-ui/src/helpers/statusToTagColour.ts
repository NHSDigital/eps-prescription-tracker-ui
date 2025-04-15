// src/helpers/statusToTagColour.ts

export type NhsTagColor =
  | "white" | "grey" | "green" | "aqua-green"
  | "blue" | "purple" | "pink" | "red"
  | "orange" | "yellow"

export type StatusCategory = "dispensed" | "prescribed" | "other"

type StatusMetadata = {
  color: NhsTagColor
  category: StatusCategory
}

const statusMap: Record<string, StatusMetadata> = {
  // Prescription-level
  "next repeat ready to be downloaded": {color: "orange", category: "other"},
  "available to download": {color: "yellow", category: "other"},
  "downloaded by a dispenser": {color: "purple", category: "other"},
  "some items dispensed": {color: "blue", category: "dispensed"},
  "expired": {color: "white", category: "prescribed"},
  "cancelled": {color: "red", category: "prescribed"},
  "all items dispensed": {color: "green", category: "dispensed"},
  "not dispensed": {color: "red", category: "prescribed"},
  "claimed": {color: "grey", category: "other"},
  "not claimed": {color: "pink", category: "other"},
  "future erd issue": {color: "aqua-green", category: "other"},
  "future issue date dispense": {color: "blue", category: "other"},
  "future prescription cancelled": {color: "red", category: "prescribed"},

  // Line item statuses
  "item fully dispensed": {color: "green", category: "dispensed"},
  "item dispensed - partial": {color: "blue", category: "dispensed"},
  "item not dispensed": {color: "orange", category: "prescribed"},
  "item not dispensed - owing": {color: "blue", category: "prescribed"},
  "item cancelled": {color: "red", category: "prescribed"},
  "item expired": {color: "white", category: "prescribed"},
  "item to be dispensed": {color: "yellow", category: "prescribed"},
  "item with dispenser": {color: "purple", category: "prescribed"}
}

export function getTagColourFromStatus(status: string): NhsTagColor | undefined {
  return statusMap[status.toLowerCase()]?.color
}

export function getStatusCategory(status: string): StatusCategory | undefined {
  return statusMap[status.toLowerCase()]?.category
}
