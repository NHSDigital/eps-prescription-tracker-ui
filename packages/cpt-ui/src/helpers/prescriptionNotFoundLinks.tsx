import {Link} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {SEARCH_TYPES, AllowedSearchType} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"

/**
 * Infers the type of search to display the correct "not found" message based on the URL parameters present.
 */
export function inferSearchType(params: URLSearchParams): AllowedSearchType {
  if (
    params.has("lastName") &&
    params.has("dobDay") &&
    params.has("dobMonth") &&
    params.has("dobYear")
  ) {
    return "BasicDetailsSearch"
  }
  if (params.has("prescriptionId")) return "PrescriptionIdSearch"
  if (params.has("nhsNumber")) return "NhsNumberSearch"
  // Fallback to BasicDetailsSearch if no other params match
  return "BasicDetailsSearch"
}

// Mapping for route paths
export const searchTypeToPath: Record<AllowedSearchType, string> = {
  [SEARCH_TYPES.PRESCRIPTION_ID]: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
  [SEARCH_TYPES.NHS_NUMBER]: FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER,
  [SEARCH_TYPES.BASIC_DETAILS]: FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
}

// Mapping for query params to keep
export const searchTypeToParams: Record<AllowedSearchType, Array<string>> = {
  [SEARCH_TYPES.PRESCRIPTION_ID]: ["prescriptionId"],
  [SEARCH_TYPES.NHS_NUMBER]: ["nhsNumber"],
  [SEARCH_TYPES.BASIC_DETAILS]: [
    "firstName",
    "lastName",
    "dobDay",
    "dobMonth",
    "dobYear",
    "postcode"
  ]
}

type AltType = { to: string; label: string }

// Helper to build alternative search links
export function buildAltLink({
  alt
}: {
  alt: AltType
}) {
  const altPath = FRONTEND_PATHS[alt.to as keyof typeof FRONTEND_PATHS]
  return (
    <Link key={alt.to} to={altPath}>
      {alt.label}
    </Link>
  )
}

// Helper to build the back link for the breadcrumb
export function buildBackLink({
  searchType,
  searchParams
}: {
  searchType: AllowedSearchType
  searchParams: URLSearchParams
}) {
  const paramsToKeep = searchTypeToParams[searchType]
  const originalParams = new URLSearchParams()
  paramsToKeep.forEach((key) => {
    const val = searchParams.get(key)
    if (val) originalParams.set(key, val)
  })
  return `${searchTypeToPath[searchType]}?${originalParams.toString()}`
}
