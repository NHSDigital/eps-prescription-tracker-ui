import React from "react"
import {Link, useSearchParams} from "react-router-dom"
import {
  Container,
  Row,
  Col,
  BackLink
} from "nhsuk-react-components"
import {SEARCH_STRINGS, STRINGS} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"
import {buildAltLink, buildBackLink, inferSearchType} from "@/helpers/prescriptionNotFoundLinks"

export default function PatientNotFoundMessage() {
  const [searchParams] = useSearchParams()
  const searchType = inferSearchType(searchParams)
  const content = SEARCH_STRINGS[searchType]

  /**
 * Renders the "body" text from the not-found message,
 * replacing placeholder tokens like {0}, {1} in the string with
 * interactive React links, as defined in `content.alternatives`.
 */
  function renderBodyWithLinks() {
    // Destructure the body array: first = first paragraph,
    // second = main sentence with {0}, {1}, rest = any additional paragraphs
    const [first, second, ...rest] = content.body

    // Regex to find all placeholder tokens like {0}, {1} in the sentence
    const regex = /\{(\d+)\}/g

    // Track where we are in the string so we can insert links between text segments
    let lastIndex = 0

    // This array will accumulate both plain text and the React Link components
    const parts: Array<React.ReactNode> = []

    let match
    // Loop through every placeholder match in the string
    while ((match = regex.exec(second)) !== null) {
      const idx = parseInt(match[1], 10) // Which alternative to use

      // Add plain text before the link, if any
      if (match.index > lastIndex) {
        parts.push(second.slice(lastIndex, match.index))
      }
      // Add the actual React Link component in place of the placeholder
      parts.push(buildAltLink({alt: content.alternatives[idx], searchParams}))

      // Update the last index to after this match
      lastIndex = regex.lastIndex
    }

    // If there is any remaining plain text after the last placeholder, add it
    if (lastIndex < second.length) {
      parts.push(second.slice(lastIndex))
    }

    // Return the formatted paragraphs: first paragraph, main sentence with embedded links, and any remaining paragraphs
    return [
      <p key="first">{first}</p>,
      <p key="second">{parts}</p>,
      ...rest.map((p, i) => <p key={i + 2}>{p}</p>)
    ]
  }

  const backLinkUrl = buildBackLink({searchType, searchParams})
  return (
    <Container
      className="nhsuk-width-container-fluid patient-not-found-container"
      data-testid="presc-not-found-message"
    >
      <nav className="nhsuk-breadcrumb nhsuk-u-padding-bottom-0 nhsuk-u-padding-left-2" aria-label="Breadcrumb">
        <BackLink
          data-testid="presc-not-found-backlink"
          asElement={Link}
          to={backLinkUrl}>
          {STRINGS.goBackLink}
        </BackLink>
      </nav>
      <main
        className="nhsuk-main-wrapper nhsuk-main-wrapper--s patient-not-found-main-wrapper"
        id="main-content"
        role="main"
        data-testid="main-content"
      >
        <Row>
          <Col width="full">
            <div
              className="query-results-header nhsuk-u-margin-left-2 nhsuk-u-margin-right-2"
              id="query-summary"
              data-testid="query-summary"
            >
              <h1
                className="patient-not-found-heading nhsuk-heading-l nhsuk-u-margin-bottom-3"
                id="results-header"
                data-testid="presc-not-found-heading"
              >
                {STRINGS.heading}
              </h1>
              {renderBodyWithLinks()}
            </div>
          </Col>
        </Row>
      </main>
    </Container>
  )
}
