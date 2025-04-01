import React from "react"
import {Link, useSearchParams} from "react-router-dom"
import {BackLink, Container} from "nhsuk-react-components"
import {PRESCRIPTION_NOT_FOUND_STRINGS} from "@/constants/ui-strings/PrescriptionNotFoundPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

export default function PrescriptionNotFoundPage() {
  const [searchParams] = useSearchParams()
  const searchType = searchParams.get("searchType")

  // Map searchType to the correct back link URL
  const getBackLinkUrl = () => {
    switch (searchType) {
      case "PrescriptionIdSearch":
        return FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      case "NhsNumberSearch":
        return FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER
      case "BasicDetailsSearch":
        return FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
      default:
        // Default fallback if no searchType is provided
        return FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
    }
  }

  const backLinkUrl = getBackLinkUrl()

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <BackLink
          data-testid="presc-not-found-backlink"
          asElement={Link}
          to={backLinkUrl}
        >
          {PRESCRIPTION_NOT_FOUND_STRINGS.backLinkText}
        </BackLink>
        <h1 data-testid="presc-not-found-header">
          {PRESCRIPTION_NOT_FOUND_STRINGS.headerText}
        </h1>
        <p data-testid="presc-not-found-body1">
          {PRESCRIPTION_NOT_FOUND_STRINGS.body1}
        </p>
      </Container>
    </main>
  )
}
