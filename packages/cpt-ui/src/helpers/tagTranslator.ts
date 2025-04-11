export type NhsTagColor =
  | "white"
  | "grey"
  | "green"
  | "aqua-green"
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"

/**
 * Maps EPS status strings to NHS tag colour values based on NHS design system.
 */
export function getTagColourFromStatus(status: string): NhsTagColor | undefined {
  const lowerStatus = status.toLowerCase()

  const statusMap: Record<string, NhsTagColor> = {
    // Prescription-level statuses
    "next repeat ready to be downloaded": "orange",
    "available to download": "yellow",
    "downloaded by a dispenser": "purple",
    "some items dispensed": "blue",
    "expired": "white",
    "cancelled": "red",
    "all items dispensed": "green",
    "not dispensed": "red",
    "claimed": "grey",
    "not claimed": "pink",
    "future erd issue": "aqua-green",
    "future issue date dispense": "blue",
    "future prescription cancelled": "red",

    // Line item statuses
    "item fully dispensed": "green",
    "item not dispensed": "orange",
    "item dispensed - partial": "blue",
    "item not dispensed - owing": "blue",
    "item cancelled": "red",
    "item expired": "white",
    "item to be dispensed": "yellow",
    "item with dispenser": "purple"
  }

  return statusMap[lowerStatus]
}
