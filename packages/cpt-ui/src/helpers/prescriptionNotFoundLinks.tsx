import {Link} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {SEARCH_TYPES, AllowedSearchType} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"
import {SearchParameters, SearchProviderContextType} from "@/context/SearchProvider"

/**
 * Determine the type of search based on the available URL parameters
 */
export function determineSearchType(searchContext: SearchProviderContextType): AllowedSearchType {
  // If both nhsNumber and prescriptionId are present, treat as PrescriptionListPage
  if (searchContext.nhsNumber && searchContext.prescriptionId) {
    return "PrescriptionListPage"
  }

  if (
    searchContext.lastName &&
    searchContext.dobDay &&
    searchContext.dobMonth &&
    searchContext.dobYear
  ) {
    return "BasicDetailsSearch"
  }
  if (searchContext.prescriptionId) return "PrescriptionIdSearch"
  if (searchContext.nhsNumber) return "NhsNumberSearch"
  // Fallback to BasicDetailsSearch if no other params match
  return "BasicDetailsSearch"
}

// Maps search types to their corresponding frontend route
export const searchTypeToPath: Record<AllowedSearchType, string> = {
  [SEARCH_TYPES.PRESCRIPTION_ID]: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
  [SEARCH_TYPES.NHS_NUMBER]: FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER,
  [SEARCH_TYPES.BASIC_DETAILS]: FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS,
  [SEARCH_TYPES.PRESCRIPTION_LIST]: FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT
}

// Defines which query params are relevant for each search type
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
  ],
  [SEARCH_TYPES.PRESCRIPTION_LIST]: ["nhsNumber", "prescriptionId"]
}

type AltType = { to: string; label: string }

/**
 * Builds an alternative search link (e.g., "Search using NHS number")
 */
export function buildAltLink({alt}: { alt: AltType }) {
  const altPath = FRONTEND_PATHS[alt.to as keyof typeof FRONTEND_PATHS]
  return (
    <Link key={alt.to} to={altPath}>
      {alt.label}
    </Link>
  )
}

// Helper to build the back link for the breadcrumb
export function buildBackLink(
  searchType: AllowedSearchType,
  searchContext: SearchProviderContextType
) {
  const searchParams = searchContext.getAllSearchParameters()
  const allowedKeys = searchTypeToParams[searchType]

  if (searchParams) {
    const filteredParams = Object.fromEntries(
      Object.entries(searchParams).filter(([key]) =>
        allowedKeys.includes(key)
      )
    ) as SearchParameters
    searchContext.clearSearchParameters()
    searchContext.setAllSearchParameters(filteredParams)
    return searchTypeToPath[searchType]

  }
  // default to basic details search
  return searchTypeToPath[SEARCH_TYPES.BASIC_DETAILS]
}
