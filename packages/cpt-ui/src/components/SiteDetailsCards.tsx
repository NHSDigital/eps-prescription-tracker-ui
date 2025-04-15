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
    <Card
      cardType="primary"
      clickable={false}
      className="site-card"
      // The test id here includes the heading - later, this will be used for regression tests to find the cards
      data-testid={`site-card-${heading.replaceAll(" ", "-").toLowerCase()}`}
    >
      <Card.Content className="site-card content">
        <Card.Description>
          <p className="nhsuk-u-margin-bottom-2">
            <strong>{heading}</strong>
            <br />
            {ODS_LABEL(name, odsCode)}
          </p>
          <p className="nhsuk-u-margin-bottom-2">{address}</p>
          <p className={`nhsuk-u-margin-bottom-${prescribedFrom ? "2" : "1"}`}>
            <strong>{CONTACT_DETAILS}</strong>
            <br />
            {telephone}
          </p>
          {prescribedFrom && (
            <p className="nhsuk-u-margin-bottom-1" data-testid="site-card-prescribed-from">
              <strong>{PRESCRIBED_FROM}</strong>
              <br />
              {humanReadablePrescribedFrom}
            </p>
          )}
        </Card.Description>
      </Card.Content>
    </Card>
  )
}

export function SiteDetailsCards({
  prescriber,
  dispenser,
  nominatedDispenser
}: SiteDetailsCardsProps) {

  return (
    <Row>
      <Col width="full" className="site-card-column">
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
