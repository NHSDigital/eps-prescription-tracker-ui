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

export function formatMessageDateTime(isoDateString: string): string {
  const MONTH_SHORT_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]

  try {
    const date = new Date(isoDateString)
    if (isNaN(date.getTime())) return "Invalid date"

    const day = String(date.getDate()).padStart(2, "0")
    const month = MONTH_SHORT_NAMES[date.getMonth()]
    const year = String(date.getFullYear())
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
  } catch {
    return "Invalid date"
  }
}

export function formatIssueDate(isoDateString: string): string {
  const MONTH_SHORT_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]

  try {
    const date = new Date(isoDateString)
    if (isNaN(date.getTime())) return "Invalid date"

    // These methods automatically convert from UTC to user's local timezone
    const day = String(date.getDate()).padStart(2, "0")
    const month = MONTH_SHORT_NAMES[date.getMonth()]
    const year = String(date.getFullYear())

    return `${day}-${month}-${year}`
  } catch {
    return "Invalid date"
  }
}
