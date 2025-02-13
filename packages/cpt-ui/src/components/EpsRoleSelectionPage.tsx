import React, { useState, useEffect, } from "react"
import { useNavigate } from "react-router-dom"
import { Container, Col, Row, Details, Table, ErrorSummary, Button, InsetText } from "nhsuk-react-components"

import { useAccess } from "@/context/AccessProvider"
import EpsCard from "@/components/EpsCard"
import EpsSpinner from "@/components/EpsSpinner"
import { RoleDetails } from "@/types/TrackerUserInfoTypes"

// This is passed to the EPS card component.
export type RolesWithAccessProps = {
  role: RoleDetails
  link: string
  uuid: string
}

export type RolesWithoutAccessProps = {
  uuid: string
  orgName: string
  odsCode: string
  roleName: string
}

interface RoleSelectionPageProps {
  contentText: {
    title: string
    caption: string
    titleNoAccess: string
    captionNoAccess: string
    insetText: {
      visuallyHidden: string
      message: string
    }
    confirmButton: {
      link: string
      text: string
    }
    alternativeMessage: string
    organisation: string
    role: string
    roles_without_access_table_title: string
    noOrgName: string
    rolesWithoutAccessHeader: string
    noODSCode: string
    noRoleName: string
    noAddress: string
    errorDuringRoleSelection: string
  }
}

export default function RoleSelectionPage({
  contentText,
}: RoleSelectionPageProps) {
  const {
    title,
    caption,
    titleNoAccess,
    captionNoAccess,
    insetText,
    confirmButton,
    alternativeMessage,
    organisation,
    role,
    roles_without_access_table_title,
    noOrgName,
    rolesWithoutAccessHeader,
    noODSCode,
    noRoleName,
    errorDuringRoleSelection,
  } = contentText

  const {
    noAccess,
    selectedRole,
    rolesWithAccess: rawRolesWithAccess = [],
    rolesWithoutAccess: rawRolesWithoutAccess = [],
    loading,
    error,
  } = useAccess()

  const [loginInfoMessage, setLoginInfoMessage] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState<boolean>(false)
  const navigate = useNavigate()

  // Transform roles data for display
  const rolesWithAccess = !noAccess
    ? rawRolesWithAccess.map((role: RoleDetails, index) => ({
      uuid: `role_with_access_${index}`,
      role,
      link: "/yourselectedrole",
    }))
    : [];

  const rolesWithoutAccess = rawRolesWithoutAccess.map((role, index) => ({
    uuid: `role_without_access_${index}`,
    roleName: role.role_name || noRoleName,
    orgName: role.org_name || noOrgName,
    odsCode: role.org_code || noODSCode,
  }))

  // Handle auto-redirect for single role
  useEffect(() => {
    if (rawRolesWithAccess.length === 1 && rawRolesWithoutAccess.length === 0) {
      setRedirecting(true)
      navigate("/searchforaprescription")
    }
  }, [rawRolesWithAccess, rawRolesWithoutAccess, navigate])

  // Set login message when selected role is available
  useEffect(() => {
    if (loading) return

    if (!loginInfoMessage && selectedRole) {
      setLoginInfoMessage(
        `You are currently logged in at ${selectedRole.org_name || noOrgName} (ODS: ${selectedRole.org_code || noODSCode}) with ${selectedRole.role_name || noRoleName}.`
      );
    }
  }, [selectedRole, loginInfoMessage, noOrgName, noODSCode, noRoleName, loading]);

  // Show spinner while loading or redirecting
  if (loading || redirecting) {
    return (
      <main id="main-content" className="nhsuk-main-wrapper">
        <Container>
          <Row>
            <Col width="full">
              <EpsSpinner />
            </Col>
          </Row>
        </Container>
      </main>
    )
  }

  // Show error if present
  if (error) {
    return (
      <main
        id="main-content"
        className="nhsuk-main-wrapper"
        data-testid="eps_roleSelectionComponent"
      >
        <Container>
          <Row>
            <ErrorSummary>
              <ErrorSummary.Title>
                {errorDuringRoleSelection}
              </ErrorSummary.Title>
              <ErrorSummary.List>
                <ErrorSummary.Item href="PLACEHOLDER/contact/us">
                  {error}
                </ErrorSummary.Item>
              </ErrorSummary.List>
            </ErrorSummary>
          </Row>
        </Container>
      </main>
    )
  }

  return (
    <main
      id="main-content"
      className="nhsuk-main-wrapper"
      data-testid="eps_roleSelectionComponent"
    >
      <Container role="contentinfo">
        <Row>
          <Col width="two-thirds">
            <h1 className="nhsuk-heading-xl">
              <span role="text" data-testid="eps_header_selectYourRole">
                <span className="nhsuk-title">
                  {noAccess ? titleNoAccess : title}
                </span>
                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                  <span className="nhsuk-u-visually-hidden"> - </span>
                  {!noAccess && caption}
                </span>
              </span>
            </h1>

            {noAccess && <p>{captionNoAccess}</p>}

            {selectedRole && (
              <section aria-label="Login Information">
                <InsetText data-testid="eps_select_your_role_pre_role_selected">
                  <span className="nhsuk-u-visually-hidden">
                    {insetText.visuallyHidden}
                  </span>
                  {loginInfoMessage && (
                    <p
                      dangerouslySetInnerHTML={{ __html: loginInfoMessage }}
                    ></p>
                  )}
                </InsetText>
                <Button href={confirmButton.link}>{confirmButton.text}</Button>
                <p>{alternativeMessage}</p>
              </section>
            )}
          </Col>

          {!noAccess && rolesWithAccess.length > 0 && (
            <Col width="two-thirds">
              <div className="section">
                {rolesWithAccess.map((role: RolesWithAccessProps) => (
                  <EpsCard {...role} key={role.uuid} />
                ))}
              </div>
            </Col>
          )}

          <Col width="two-thirds">
            <h3>{rolesWithoutAccessHeader}</h3>
            <Details expander>
              <Details.Summary>
                {roles_without_access_table_title}
              </Details.Summary>
              <Details.Text>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell>{organisation}</Table.Cell>
                      <Table.Cell>{role}</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {rolesWithoutAccess.map(
                      (roleItem: RolesWithoutAccessProps) => (
                        <Table.Row key={roleItem.uuid}>
                          <Table.Cell data-testid="change-role-name-cell">
                            {roleItem.orgName} (ODS: {roleItem.odsCode})
                          </Table.Cell>
                          <Table.Cell data-testid="change-role-role-cell">
                            {roleItem.roleName}
                          </Table.Cell>
                        </Table.Row>
                      )
                    )}
                  </Table.Body>
                </Table>
              </Details.Text>
            </Details>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
