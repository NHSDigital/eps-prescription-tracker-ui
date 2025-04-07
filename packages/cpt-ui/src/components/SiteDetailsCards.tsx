import {useState} from "react"

import {Card, Col, Row} from "nhsuk-react-components"

import {
  CONTACT_DETAILS,
  DISPENSER,
  NOMINATED_DISPENSER,
  ODS_LABEL,
  PRESCRIBED_FROM,
  PRESCRIBER
} from "@/constants/ui-strings/SiteDetailsCardsStrings"

type SiteCardProps = {
    heading: string
    orgName: string
    orgOds: string
    address: string
    contact: string
    prescribedFrom?: string
}

export type SiteDetailsProps = Omit<SiteCardProps, "heading">

export type SiteCardsProps = {
  prescriber: SiteDetailsProps
  dispenser?: SiteDetailsProps
  nominatedDispenser?: SiteDetailsProps
}

// FIXME: Delete this temporary component:
const Checkbox = () => {
  const [isChecked, setIsChecked] = useState(false)

  const checkHandler = () => {
    setIsChecked(!isChecked)
  }

  return (
    <div>
      <input
        type="checkbox"
        id="checkbox"
        checked={isChecked}
        onChange={checkHandler}
      />
      <label htmlFor="checkbox">Enable Shadows</label>
    </div>
  )
}

function SiteCard({
  heading,
  orgName,
  orgOds,
  address,
  contact,
  prescribedFrom
}: SiteCardProps) {
  return (
    <Card cardType="primary" clickable={false} className={"site-card shadow"}>
      <Card.Content className="site-card content">
        <Card.Description>
          <p className="nhsuk-u-margin-bottom-2">
            <strong>{heading}</strong>
            <br />
            {ODS_LABEL(orgName, orgOds)}
          </p>
          <p className={"nhsuk-u-margin-bottom-2"}>
            {address}
          </p>
          <p className="nhsuk-u-margin-bottom-2">
            <strong>{CONTACT_DETAILS}</strong>
            <br />
            {contact}
          </p>
          {prescribedFrom &&
                  <p className="nhsuk-u-margin-bottom-1">
                    <strong>{PRESCRIBED_FROM}</strong>
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
        { dispenser &&
          <SiteCard heading={DISPENSER} {...dispenser} />
        }
        {nominatedDispenser &&
          <SiteCard heading={NOMINATED_DISPENSER} {...nominatedDispenser} />
        }
        <SiteCard heading={PRESCRIBER} {...prescriber} />
      </Col>
      <Checkbox
        shadowEnabled
      />
    </Row>
  )
}
