import {BasicDetailsSearchType} from "@cpt-ui-common/common-types"

/**
 * Formats the provided day, month, and year fields into a string in the format DD-MM-YYYY.
 * If any part of the date is missing, fallback placeholders ("??" or "????") are used.
 */
export function formatDob({
  dobDay,
  dobMonth,
  dobYear
}: Pick<BasicDetailsSearchType, "dobDay" | "dobMonth" | "dobYear">): string {
  const day = dobDay?.padStart(2, "0") ?? "??"
  const month = dobMonth?.padStart(2, "0") ?? "??"
  const year = dobYear ?? "????"
  return `${day}-${month}-${year}`
}
