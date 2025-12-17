import {STRINGS} from "@/constants/ui-strings/PatientDetailsBannerStrings"
import {BasicDetailsSearchType} from "@cpt-ui-common/common-types"

const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

/**
 * parses a date string and returns a valid Date object or null
 */
function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * formats a Date object into DD-MMM-YYYY format, optionally with time
 */
function formatDate(date: Date, includeTime = false): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = MONTH_SHORT_NAMES[date.getMonth()]
  const year = String(date.getFullYear())

  if (!includeTime) {
    return `${day}-${month}-${year}`
  }

  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

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
  if (!dobDay || !dobMonth || !dobYear) return STRINGS.NOT_AVAILABLE

  const day = dobDay.padStart(2, "0")
  const monthIndex = parseInt(dobMonth, 10) - 1
  const month = MONTH_SHORT_NAMES[monthIndex] ?? "Invalid"
  return `${day}-${month}-${dobYear}`
}

/**
 * Formats the provided day, month, and year into a human-readable display format: DD-MMM-YYYY.
 * Returns "Invalid date" if any component is missing or unparsable.
 */
export const formatDobTextForDisplay = (dobText: string): string => {
  const date = parseDate(dobText)
  return date ? formatDate(date) : STRINGS.NOT_AVAILABLE
}

export function formatMessageDateTime(isoDateString: string): string {
  const date = parseDate(isoDateString)
  return date ? formatDate(date, true) : "Invalid date"
}

export function formatIssueDate(isoDateString: string): string {
  const date = parseDate(isoDateString)
  return date ? formatDate(date) : "Invalid date"
}
