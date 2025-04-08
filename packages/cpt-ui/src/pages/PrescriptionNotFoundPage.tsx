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

    // Preserve any search terms
    const params = searchParams
      .entries()
      .filter(
        (entry) => {
          return (entry[0] !== "searchType")
        }
      )
      .toArray()
    const newQueryString = new URLSearchParams(params)

    console.info("Search type", searchType)

    switch (searchType) {
      case "prescriptionId":
        return FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID + "?" + newQueryString.toString()
      case "nhsNumber":
        return FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER + "?" + newQueryString.toString()
      case "basicDetails":
        return FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS + "?" + newQueryString.toString()
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
