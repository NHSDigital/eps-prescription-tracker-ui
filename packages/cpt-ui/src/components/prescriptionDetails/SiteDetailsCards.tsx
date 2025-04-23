import {Card, Col, Row} from "nhsuk-react-components"

import {PrescriberOrganisationSummary, OrganisationSummary} from "@cpt-ui-common/common-types"

import {
  HEADING,
  CONTACT_DETAILS,
  DISPENSER,
  NOMINATED_DISPENSER,
  ODS_LABEL,
  PRESCRIBED_FROM,
  PRESCRIBER,
  NO_ORG_NAME,
  NO_ADDRESS,
  NO_CONTACT,
  ENGLAND,
  WALES,
  IOM
} from "@/constants/ui-strings/SiteDetailsCardsStrings"

export type SiteDetailsCardProps = OrganisationSummary & {
  heading: string
  // This is a bit of a kludge, but its cleaner than defining two new prop types
  prescribedFrom?: string
}

export type SiteDetailsCardsProps = {
  prescriber: PrescriberOrganisationSummary
  dispenser?: OrganisationSummary
  nominatedDispenser?: OrganisationSummary
}

export function SiteDetailsCard({
  heading,
  name,
  odsCode,
  address,
  telephone,
  prescribedFrom
}: SiteDetailsCardProps) {

  if (!name) {
    name = NO_ORG_NAME
  }
  if (!address) {
    address = NO_ADDRESS
  }
  if (!telephone) {
    telephone = NO_CONTACT
  }

  let humanReadablePrescribedFrom
  if (!prescribedFrom) {
    humanReadablePrescribedFrom = undefined
  } else if (prescribedFrom.startsWith("01") || prescribedFrom.startsWith("10")) {
    humanReadablePrescribedFrom = ENGLAND
  } else if (prescribedFrom.startsWith("02") || prescribedFrom.startsWith("20")) {
    humanReadablePrescribedFrom = WALES
  } else if (prescribedFrom.startsWith("05") || prescribedFrom.startsWith("50")) {
    humanReadablePrescribedFrom = IOM
  } else {
    // Fall back to using the incoming code
    humanReadablePrescribedFrom = prescribedFrom
  }

  return (
    <div className="data-panel__wrapper no-outline" tabIndex={-1}>
      <Card
        cardType="primary"
        clickable={false}
        className="nhsuk-u-margin-bottom-3"
        // The test id here includes the heading - later, this will be used for regression tests to find the cards
        data-testid={`site-card-${heading.replaceAll(" ", "-").toLowerCase()}`}
      >
        <Card.Content className="nhsuk-u-padding-top-3 nhsuk-u-padding-bottom-1
                                 nhsuk-u-padding-right-3 nhsuk-u-padding-left-3">
          <Card.Description>
            <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
              {heading}
            </Card.Heading>
            <p className="nhsuk-u-margin-bottom-2">
              {ODS_LABEL(name, odsCode)}
            </p>
            <p className="nhsuk-u-margin-bottom-2">{address}</p>

            <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
              {CONTACT_DETAILS}
            </Card.Heading>
            <p className={`nhsuk-u-margin-bottom-${prescribedFrom ? "2" : "1"}`}>
              {telephone}
            </p>

            {prescribedFrom && (
              <>
                <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
                  {PRESCRIBED_FROM}
                </Card.Heading>
                <p className="nhsuk-u-margin-bottom-1" data-testid="site-card-prescribed-from">
                  {humanReadablePrescribedFrom}
                </p>
              </>
            )}
          </Card.Description>
        </Card.Content>
      </Card>
    </div>
  )
}

export function SiteDetailsCards({
  prescriber,
  dispenser,
  nominatedDispenser
}: SiteDetailsCardsProps) {

  return (
    <Row>
      <Col width="full">
        <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">{HEADING}</h2>
        {dispenser && (
          <SiteDetailsCard heading={DISPENSER} {...dispenser} />
        )}
        {nominatedDispenser && (
          <SiteDetailsCard
            heading={NOMINATED_DISPENSER}
            {...nominatedDispenser}
          />
        )}
        <SiteDetailsCard heading={PRESCRIBER} {...prescriber} />
      </Col>
    </Row>
  )
}
