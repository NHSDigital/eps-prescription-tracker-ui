import {Card, Col, Row} from "nhsuk-react-components"

export interface SiteCardProps {
    heading: string
    orgName: string
    orgOds: string
    address: string
    contact: string
    prescribedFrom?: string
}

export interface SiteCardsProps {
  prescriber: Omit<SiteCardProps, "heading">
  dispenser?: Omit<SiteCardProps, "heading">
  nominatedDispenser?: Omit<SiteCardProps, "heading">
}

export function SiteCard({
  heading,
  orgName,
  orgOds,
  address,
  contact,
  prescribedFrom
}: SiteCardProps) {

  return (
    <Card cardType="primary" clickable={false}>
      <Card.Content>
        <Card.Description>
          <p className="nhsuk-u-margin-bottom-2">
            <strong>{heading}</strong>
            <br />
            {`${orgName} (ODS ${orgOds})`}
          </p>
          <p className={"nhsuk-u-margin-bottom-2"}>
            {address}
          </p>
          <p className="nhsuk-u-margin-bottom-2">
            <strong>Contact Details</strong>
            <br />
            {contact}
          </p>
          {prescribedFrom &&
                  <p className="nhsuk-u-margin-bottom-1">
                    <strong>Prescribed from</strong>
                    <br />
                    {prescribedFrom}
                  </p>
          }
        </Card.Description>
      </Card.Content>
    </Card>
  )
}

export function SiteCards({
  prescriber,
  dispenser,
  nominatedDispenser
}: SiteCardsProps) {
  return (
    <Row>
      <Col width="one-third">
        <SiteCard heading={"Prescriber"} {...prescriber} />
        { dispenser &&
          <SiteCard heading={"Dispenser"} {...dispenser} />
        }
        {nominatedDispenser &&
          <SiteCard heading={"Nominated Dispenser"} {...nominatedDispenser} />
        }
      </Col>
    </Row>
  )
}
