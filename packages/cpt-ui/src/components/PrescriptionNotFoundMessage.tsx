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

export default function PrescriptionNotFoundMessage() {
  const [searchParams] = useSearchParams()
  const searchType = inferSearchType(searchParams)
  const content = SEARCH_STRINGS[searchType]

  /**
 * Renders the not-found message body, replacing {0}, {1} tokens
 * with the corresponding React links from `content.alternatives`.
 */
  function renderBodyWithLinks() {
    const [first, second, ...rest] = content.body
    const regex = /\{(\d+)\}/g
    let lastIndex = 0
    const parts: Array<React.ReactNode> = []
    let match
    while ((match = regex.exec(second)) !== null) {
      const idx = parseInt(match[1], 10) // Which alternative to use

      // Add plain text before the link
      if (match.index > lastIndex) {
        parts.push(second.slice(lastIndex, match.index))
      }
      // Add the actual React Link component in place of the placeholder
      parts.push(buildAltLink({alt: content.alternatives[idx]}))
      lastIndex = regex.lastIndex
    }

    // Add any remaining text after the last placeholder
    if (lastIndex < second.length) {
      parts.push(second.slice(lastIndex))
    }
    return [
      <p key="first">{first}</p>,
      <p key="second">{parts}</p>,
      ...rest.map((p: string, i: number) => <p key={i + 2}>{p}</p>)
    ]
  }

  const backLinkUrl = buildBackLink(searchType, searchParams)

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
