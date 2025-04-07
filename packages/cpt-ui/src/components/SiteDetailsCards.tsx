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
  shadowEnabled: boolean
}

export type SiteDetailsProps = Omit<SiteCardProps, "heading" | "shadowEnabled">

export type SiteCardsProps = {
  prescriber: SiteDetailsProps
  dispenser?: SiteDetailsProps
  nominatedDispenser?: SiteDetailsProps
}

// FIXME: Delete this temporary demo code
const Checkbox = ({shadowEnabled, onToggle}: { shadowEnabled: boolean, onToggle: () => void }) => {
  return (
    <div>
      <input
        type="checkbox"
        id="checkbox"
        checked={shadowEnabled}
        onChange={onToggle}
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
  prescribedFrom,
  shadowEnabled
}: SiteCardProps) {
  return (
    <Card
      cardType="primary"
      clickable={false}
      className={`site-card ${shadowEnabled ? "shadow" : ""}`}
    >
      <Card.Content className="site-card content">
        <Card.Description>
          <p className="nhsuk-u-margin-bottom-2">
            <strong>{heading}</strong>
            <br />
            {ODS_LABEL(orgName, orgOds)}
          </p>
          <p className="nhsuk-u-margin-bottom-2">{address}</p>
          <p className="nhsuk-u-margin-bottom-2">
            <strong>{CONTACT_DETAILS}</strong>
            <br />
            {contact}
          </p>
          {prescribedFrom && (
            <p className="nhsuk-u-margin-bottom-1">
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

export function SiteCards({
  prescriber,
  dispenser,
  nominatedDispenser
}: SiteCardsProps) {
  const [shadowEnabled, setShadowEnabled] = useState(true)

  const toggleShadows = () => setShadowEnabled((prev) => !prev)

  return (
    <Row>
      <Col width="one-third">
        {dispenser && (
          <SiteCard heading={DISPENSER} {...dispenser} shadowEnabled={shadowEnabled} />
        )}
        {nominatedDispenser && (
          <SiteCard
            heading={NOMINATED_DISPENSER}
            {...nominatedDispenser}
            shadowEnabled={shadowEnabled}
          />
        )}
        <SiteCard heading={PRESCRIBER} {...prescriber} shadowEnabled={shadowEnabled} />
      </Col>
      <Checkbox shadowEnabled={shadowEnabled} onToggle={toggleShadows} />
    </Row>
  )
}
