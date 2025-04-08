import {Card, Col, Row} from "nhsuk-react-components"

import {PrescriberOrganisationSummary, OrganisationSummary} from "@cpt-ui-common/common-types/src/prescriptionDetails"

import {
  CONTACT_DETAILS,
  DISPENSER,
  NOMINATED_DISPENSER,
  ODS_LABEL,
  PRESCRIBED_FROM,
  PRESCRIBER,
  NO_ORG_NAME,
  NO_ADDRESS,
  NO_CONTACT
} from "@/constants/ui-strings/SiteDetailsCardsStrings"

export type SiteDetailsCardProps = {
  heading: string
  name?: string
  odsCode: string
  address?: string
  telephone?: string
  prescribedFrom?: string
}

export type SiteDetailsProps = Omit<SiteDetailsCardProps, "heading">

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

  return (
    <Card
      cardType="primary"
      clickable={false}
      className="site-card" // shadow class adds the bottom shadow, if required
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
          <p className="nhsuk-u-margin-bottom-2">
            <strong>{CONTACT_DETAILS}</strong>
            <br />
            {telephone}
          </p>
          {prescribedFrom && (
            <p className="nhsuk-u-margin-bottom-1" data-testid="site-card-prescribed-from">
              <strong>{PRESCRIBED_FROM}</strong>
              <br />
              {prescribedFrom}
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
      <Col width="one-third">
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
