import {BasicDetailsSearchType} from "@cpt-ui-common/common-types"

/**
 * Formats the provided day, month, and year fields into a string in the format DD-MM-YYYY.
 * If any part of the date is missing, fallback placeholders ("??" or "????") are used.
 */
export function formatDobForSearch({
  dobDay,
  dobMonth,
  dobYear
}: Pick<BasicDetailsSearchType, "dobDay" | "dobMonth" | "dobYear">): string {
  const day = dobDay?.padStart(2, "0") ?? "??"
  const month = dobMonth?.padStart(2, "0") ?? "??"
  const year = dobYear ?? "????"
  return `${day}-${month}-${year}`
}

/**
 * Formats the provided day, month, and year into a human-readable display format: DD-MMM-YYYY.
 * Returns "Invalid date" if any component is missing or unparsable.
 */
export function formatDobForDisplay({
  dobDay,
  dobMonth,
  dobYear
}: Pick<BasicDetailsSearchType, "dobDay" | "dobMonth" | "dobYear">): string {
  const MONTH_SHORT_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]

  if (!dobDay || !dobMonth || !dobYear) return "Invalid date"

  const day = dobDay.padStart(2, "0")
  const monthIndex = parseInt(dobMonth, 10) - 1
  const month = MONTH_SHORT_NAMES[monthIndex] ?? "Invalid"
  return `${day}-${month}-${dobYear}`
}
