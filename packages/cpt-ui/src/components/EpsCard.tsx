import React from "react"
import {Card, Col, Row} from "nhsuk-react-components"

import {useNavigate} from "react-router-dom"

import {RoleDetails} from "@cpt-ui-common/common-types"

import {EPS_CARD_STRINGS} from "@/constants/ui-strings/CardStrings"
import {useAuth} from "@/context/AuthProvider"
import axios from "axios"
import {logger} from "@/helpers/logger"
import {handleRestartLogin} from "@/helpers/logout"

export interface EpsCardProps {
  role: RoleDetails
  link: string
}

export default function EpsCard({role, link}: EpsCardProps) {
  const navigate = useNavigate()
  const authContext = useAuth()

  const handleSetSelectedRole = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    try {
      await authContext.updateSelectedRole(role)
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401)) {
        const invalidSessionCause = err.response?.data?.invalidSessionCause
        handleRestartLogin(authContext, invalidSessionCause)
        return
      }

      logger.error("Error selecting role:", err)
    }

    // Redirect to the appropriate page
    navigate(link)
  }

  const {
    noODSCode,
    noOrgName,
    noRoleName,
    noAddress,
    odsLabel
  } = EPS_CARD_STRINGS

  return (
    <Card clickable className="eps-card" data-testid="eps-card">
      <Card.Content>
        <Row className="nhsuk-grid-row eps-card__content">
          <Col width='one-half'>
            <div
              className="eps-card__org-focus-area"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleSetSelectedRole(e)
                }
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleSetSelectedRole(e)
              }}
            >
              <div className="eps-card__org-name">
                <Card.Heading className="nhsuk-heading-s">
                  {role.org_name || noOrgName} ({odsLabel}: {role.org_code || noODSCode})
                </Card.Heading>
              </div>
            </div>
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
