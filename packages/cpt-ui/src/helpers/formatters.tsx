import {BasicDetailsSearchType} from "@cpt-ui-common/common-types"

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
