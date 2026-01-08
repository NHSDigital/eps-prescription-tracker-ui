import React, {useEffect, useState} from "react"

import {
  Container,
  Col,
  Row,
  SummaryList
} from "nhsuk-react-components"
import {Link} from "react-router-dom"

import {YOUR_SELECTED_ROLE_STRINGS} from "@/constants/ui-strings/YourSelectedRoleStrings"
import {useAuth} from "@/context/AuthProvider"
import {Button} from "@/components/ReactRouterButton"
import {FRONTEND_PATHS} from "@/constants/environment"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function YourSelectedRolePage() {
  const {selectedRole} = useAuth()
  usePageTitle(YOUR_SELECTED_ROLE_STRINGS.pageTitle)

  const [roleName, setRoleName] = useState<string>(YOUR_SELECTED_ROLE_STRINGS.noRoleName)
  const [orgName, setOrgName] = useState<string>(YOUR_SELECTED_ROLE_STRINGS.noOrgName)
  const [odsCode, setOdsCode] = useState<string>(YOUR_SELECTED_ROLE_STRINGS.noODSCode)

  useEffect(() => {
    if (!selectedRole) {
      // Set fallback values if selectedRole is undefined
      setRoleName(YOUR_SELECTED_ROLE_STRINGS.noRoleName)
      setOrgName(YOUR_SELECTED_ROLE_STRINGS.noOrgName)
      setOdsCode(YOUR_SELECTED_ROLE_STRINGS.noODSCode)
      return
    }

    setRoleName(selectedRole.role_name || YOUR_SELECTED_ROLE_STRINGS.noRoleName)
    setOrgName(selectedRole.org_name || YOUR_SELECTED_ROLE_STRINGS.noOrgName)
    setOdsCode(selectedRole.org_code || YOUR_SELECTED_ROLE_STRINGS.noODSCode)
  }, [selectedRole])

  const {
    heading,
    subheading,
    tableTitle,
    roleLabel,
    orgLabel,
    changeLinkText,
    confirmButtonText
  } = YOUR_SELECTED_ROLE_STRINGS

  return (
    <main className="nhsuk-main-wrapper" id="main-content">
      <Container>
        <Row>
          <Col width="full">
            <h1 className="nhsuk-heading-xl">
              <span role="text" data-testid="eps_yourSelectedRole_page">
                <span className="nhsuk-title">
                  {heading}
                </span>
                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                  <span className="nhsuk-u-visually-hidden"> - </span>
                  {subheading}
                </span>
              </span>
            </h1>
          </Col>

          {/* Roles without access Section */}
          <Col width="two-thirds">
            <h2>{tableTitle}</h2>
            <SummaryList>
              <SummaryList.Row key="role-row">
                <SummaryList.Key data-testid="role-label">
                  <b>{roleLabel}</b>
                </SummaryList.Key>
                <SummaryList.Value data-testid="role-text">
                  {roleName}
                </SummaryList.Value>
                <SummaryList.Actions>
                  <Link
                    data-testid="role-change-role-cell"
                    to={FRONTEND_PATHS.CHANGE_YOUR_ROLE}
                  >
                    {changeLinkText}
                    <span className="nhsuk-u-visually-hidden">
                      {YOUR_SELECTED_ROLE_STRINGS.role}
                    </span>
                  </Link>
                </SummaryList.Actions>
              </SummaryList.Row>
              <SummaryList.Row key="org-row">
                <SummaryList.Key data-testid="org-label">
                  <b>{orgLabel}</b>
                </SummaryList.Key>
                <SummaryList.Value data-testid="org-text">
                  {orgName} ({YOUR_SELECTED_ROLE_STRINGS.odsCode}: {odsCode})
                </SummaryList.Value>
                <SummaryList.Actions data-testid="org-change-role-cell">
                  <Link
                    data-testid="org-change-role-cell"
                    to={FRONTEND_PATHS.CHANGE_YOUR_ROLE}
                  >
                    {changeLinkText}
                    <span className="nhsuk-u-visually-hidden">
                      {YOUR_SELECTED_ROLE_STRINGS.organisation}
                    </span>
                  </Link>
                </SummaryList.Actions>
              </SummaryList.Row>
            </SummaryList>
          </Col>
        </Row>

        <Row>
          <Col width="two-thirds">
            <Button
              to={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID}
              data-testid="confirm-and-continue"
            >
              {confirmButtonText}
            </Button>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
