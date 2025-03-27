import React, {useContext} from "react"
import {Card, Col, Row} from "nhsuk-react-components"

import {AuthContext} from "@/context/AuthProvider"
import {useAccess} from "@/context/AccessProvider"
import {useNavigate} from "react-router-dom"

import {RoleDetails} from "@/types/TrackerUserInfoTypes"

import {EPS_CARD_STRINGS} from "@/constants/ui-strings/CardStrings"
import {API_ENDPOINTS} from "@/constants/environment"

export interface EpsCardProps {
  role: RoleDetails
  link: string
}

export default function EpsCard({role, link}: EpsCardProps) {
  const navigate = useNavigate()
  const {updateSelectedRole} = useAccess()

  const handleSetSelectedRole = async (e: React.MouseEvent) => {
    e.preventDefault()
    await updateSelectedRole(role)

    // Redirect to the appropriate page
    navigate(link)
  }

  const {
    noODSCode,
    noOrgName,
    noRoleName,
    noAddress
  } = EPS_CARD_STRINGS

  return (
    <Card clickable className="eps-card">
      <Card.Content>
        <Row className="nhsuk-grid-row eps-card__content">

          <Col width='one-half'>
            <Card.Link
              href={link}
              onClick={handleSetSelectedRole}
            >
              <Card.Heading className="nhsuk-heading-s">
                {role.org_name || noOrgName}
                <br />
                (ODS: {role.org_code || noODSCode})
              </Card.Heading>
            </Card.Link>
            <Card.Description className="eps-card__roleName">
              {role.role_name || noRoleName}
            </Card.Description>
          </Col>

          <Col width='one-half'>
            <Card.Description className="eps-card__siteAddress">
              {(role.site_address || noAddress)
                .split("\n")
                .map((line: string, index: number) => (
                  <span
                    key={index}
                    className="eps-card__siteAddress-line"
                  >
                    {line}
                    <br />
                  </span>
                ))}
            </Card.Description>
          </Col>
        </Row>
      </Card.Content>
    </Card>
  )
}
