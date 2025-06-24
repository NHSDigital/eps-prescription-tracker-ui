import {Link} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {SEARCH_TYPES, AllowedSearchType} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"
import {logger} from "./logger"

/**
 * Determine the type of search based on the available URL parameters
 */
export function determineSearchType (params: URLSearchParams): AllowedSearchType {
  // If both nhsNumber and prescriptionId are present, treat as PrescriptionListPage
  if (params.has("nhsNumber") && params.has("prescriptionId")) {
    return "PrescriptionListPage"
  }

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

/**
 * Builds a "go back" link to the relevant search form or results page,
 * preserving only the relevant search parameters.
 */
export function buildBackLink(searchType: AllowedSearchType, searchParams: URLSearchParams): string {
  const filteredParams = new URLSearchParams()

  const nhsNumber = searchParams.get("nhsNumber")
  const prescriptionId = searchParams.get("prescriptionId")

  const searchNhsNumber = nhsNumber && nhsNumber !== "null"
  const searchPrescriptionId = prescriptionId && prescriptionId !== "null"

  // Iterate only over query parameters defined as relevant for this search type
  for (const key of searchTypeToParams[searchType]) {
    const value = searchParams.get(key)

    logger.debug(`Processing key: ${key}, value: ${value}`)

    // If nhsNumber is invalid ("null"), skip it
    if (key === "nhsNumber" && !searchNhsNumber) {
      continue
    }

    // If both nhsNumber and prescriptionId are valid, we only want to keep nhsNumber
    if (key === "prescriptionId" && searchNhsNumber && searchPrescriptionId) {
      continue
    }

    // Add the param if it has a usable value
    if (value) {
      filteredParams.set(key, value)
    }
  }

  const path = searchTypeToPath[searchType]
  const query = filteredParams.toString()
  return query ? `${path}?${query}` : path
}
