import React, {useEffect, useState} from "react"

import {
  Container,
  Col,
  Row,
  Table
} from "nhsuk-react-components"
import {Link} from "react-router-dom"

import {YOUR_SELECTED_ROLE_STRINGS} from "@/constants/ui-strings/YourSelectedRoleStrings"
import {useAuth} from "@/context/AuthProvider"
import {Button} from "@/components/ReactRouterButton"
import {FRONTEND_PATHS} from "@/constants/environment"

export default function YourSelectedRolePage() {
  const {selectedRole} = useAuth()

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
    <main className="nhsuk-main-wrapper">
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
            <Table>
              <Table.Body>
                <Table.Row key="role-row">
                  <Table.Cell data-testid="role-label">
                    <b>{roleLabel}</b>
                  </Table.Cell>
                  <Table.Cell data-testid="role-text">
                    {roleName}
                  </Table.Cell>
                  <Table.Cell data-testid="role-change-role-cell">
                    <Link
                      to={FRONTEND_PATHS.CHANGE_YOUR_ROLE}
                    >
                      {changeLinkText}
                    </Link>
                  </Table.Cell>
                </Table.Row>
                <Table.Row key="org-row">
                  <Table.Cell data-testid="org-label">
                    <b>{orgLabel}</b>
                  </Table.Cell>
                  <Table.Cell data-testid="org-text">
                    {orgName} (ODS: {odsCode})
                  </Table.Cell>
                  <Table.Cell data-testid="org-change-role-cell">
                    <Link
                      to={FRONTEND_PATHS.CHANGE_YOUR_ROLE}
                    >
                      {changeLinkText}
                    </Link>
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
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
