import {logger} from "@/helpers/logger"

interface SearchParameters {
  nhsNumber?: string
  prescriptionId?: string
  firstName?: string
  lastName?: string
}

interface SearchContext {
  nhsNumber?: string
  prescriptionId?: string
}

export interface SearchParamsResult {
  searchParams: URLSearchParams
  hasValidSearchCriteria: boolean
  shouldRedirectToPrescriptionSearch: boolean
}

/**
 * Builds search parameters for prescription list API call by prioritising original search parameters
 * over search context to avoid contaminated data from prescription details navigation.
 *
 * @param originalSearchParams - Original search parameters from navigation context
 * @param searchContext - Current search context
 * @returns Object containing search parameters and navigation flags
 */
export function buildPrescriptionSearchParams(
  originalSearchParams: SearchParameters | null,
  searchContext: SearchContext
): SearchParamsResult {
  const searchParams = new URLSearchParams()
  let hasValidSearchCriteria = false

  // First priority: Use original search parameters if available
  if (originalSearchParams) {
    const result = processOriginalSearchParams(originalSearchParams, searchParams)
    hasValidSearchCriteria = result.hasValidSearchCriteria

    if (result.shouldRedirectToPrescriptionSearch) {
      return {
        searchParams,
        hasValidSearchCriteria: false,
        shouldRedirectToPrescriptionSearch: true
      }
    }
  }

  // Second priority: Fall back to search context if no valid criteria found
  if (!hasValidSearchCriteria) {
    hasValidSearchCriteria = processSearchContext(searchContext, searchParams)
  }

  return {
    searchParams,
    hasValidSearchCriteria,
    shouldRedirectToPrescriptionSearch: false
  }
}

/**
 * Process original search parameters and determine the appropriate search strategy
 */
function processOriginalSearchParams(
  originalSearchParams: SearchParameters,
  searchParams: URLSearchParams
): { hasValidSearchCriteria: boolean; shouldRedirectToPrescriptionSearch: boolean } {
  // Use NHS number if available (highest priority)
  if (originalSearchParams.nhsNumber) {
    searchParams.append("nhsNumber", originalSearchParams.nhsNumber)
    logger.info("Using original NHS number from navigation context", {
      nhsNumber: originalSearchParams.nhsNumber
    })
    return {hasValidSearchCriteria: true, shouldRedirectToPrescriptionSearch: false}
  }

  // Use prescription ID if it was the sole original search criterion
  if (originalSearchParams.prescriptionId &&
      !originalSearchParams.nhsNumber &&
      !originalSearchParams.firstName &&
      !originalSearchParams.lastName) {
    searchParams.append("prescriptionId", originalSearchParams.prescriptionId)
    logger.info("Using original prescription ID from navigation context", {
      prescriptionId: originalSearchParams.prescriptionId
    })
    return {hasValidSearchCriteria: true, shouldRedirectToPrescriptionSearch: false}
  }

  // Handle basic details search without NHS number
  if ((originalSearchParams.firstName || originalSearchParams.lastName) &&
      !originalSearchParams.nhsNumber) {
    logger.info("Basic details present but no NHS number - redirecting to prescription ID search")
    return {hasValidSearchCriteria: false, shouldRedirectToPrescriptionSearch: true}
  }

  return {hasValidSearchCriteria: false, shouldRedirectToPrescriptionSearch: false}
}

/**
 * Process search context as fallback when original search parameters don't provide valid criteria
 */
function processSearchContext(
  searchContext: SearchContext,
  searchParams: URLSearchParams
): boolean {
  if (searchContext.nhsNumber) {
    searchParams.append("nhsNumber", searchContext.nhsNumber)
    return true
  }

  if (searchContext.prescriptionId) {
    searchParams.append("prescriptionId", searchContext.prescriptionId)
    return true
  }

  return false
}
