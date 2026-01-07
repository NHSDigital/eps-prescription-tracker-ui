import React from "react"
import {useNavigate} from "react-router-dom"
import {
  Container,
  Col,
  Row,
  Details,
  Table,
  ErrorSummary,
  InsetText,
  Card
} from "nhsuk-react-components"

import {useAuth} from "@/context/AuthProvider"
import EpsSpinner from "@/components/EpsSpinner"
import {RoleDetails} from "@cpt-ui-common/common-types"
import {Button} from "./ReactRouterButton"
import {FRONTEND_PATHS} from "@/constants/environment"
import {getSearchParams} from "@/helpers/getSearchParams"
import {logger} from "@/helpers/logger"
import axios from "axios"
import {handleRestartLogin} from "@/helpers/logout"

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
      loggedInTemplate: string
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
  contentText
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
    errorDuringRoleSelection
  } = contentText

  const auth = useAuth()
  const navigate = useNavigate()

  if (auth.isSigningIn) {
    const {codeParams, stateParams} = getSearchParams(window)
    if (codeParams && stateParams) {
      // we are in a redirect from login flow so show spinner
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
    } else {
      // something has gone wrong so go back to login
      auth.clearAuthState()
      navigate(FRONTEND_PATHS.LOGIN)
      return
    }
  }

  // Handle auto-redirect for single role
  if (auth.hasSingleRoleAccess() && auth.isSignedIn && auth.selectedRole !== undefined) {
    navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    return
  }

  const handleSetSelectedRole = async (
    e: React.MouseEvent | React.KeyboardEvent,
    role: RoleDetails
  ) => {
    e.preventDefault()
    try {
      await auth.updateSelectedRole(role)
      navigate(FRONTEND_PATHS.YOUR_SELECTED_ROLE)
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401)) {
        const invalidSessionCause = err.response?.data?.invalidSessionCause
        handleRestartLogin(auth, invalidSessionCause)
        return
      }
      logger.error("Error selecting role:", err)
    }
  }

  const handleCardKeyDown = (e: React.KeyboardEvent, role: RoleDetails) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleSetSelectedRole(e, role)
    }
  }

  const handleCardClick = (e: React.MouseEvent, role: RoleDetails) => {
    e.preventDefault()
    handleSetSelectedRole(e, role)
  }

  // Show error if present
  if (auth.error) {
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
                  {auth.error}
                </ErrorSummary.Item>
              </ErrorSummary.List>
            </ErrorSummary>
          </Row>
        </Container>
      </main>
    )
  }

  const hasNoAccess = auth.rolesWithAccess.length === 0
  const unselectedRolesWithAccess = auth.rolesWithAccess.filter(
    (role) => role.role_id !== auth.selectedRole?.role_id
  )

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
                  {hasNoAccess ? titleNoAccess : title}
                </span>
                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                  <span className="nhsuk-u-visually-hidden"> - </span>
                  {(!hasNoAccess) && caption}
                </span>
              </span>
            </h1>

            {hasNoAccess && <p>{captionNoAccess}</p>}
            {auth.selectedRole && (
              <section aria-label="Login Information">
                <InsetText data-testid="eps_select_your_role_pre_role_selected">
                  <p>
                    {insetText.loggedInTemplate
                      .replace("{orgName}", auth.selectedRole.org_name || noOrgName)
                      .replace("{odsCode}", auth.selectedRole.org_code || noODSCode)
                      .replace("{roleName}", auth.selectedRole.role_name || noRoleName)}
                  </p>
                </InsetText>
                <Button
                  to={confirmButton.link}
                  data-testid="confirm-and-continue"
                >
                  {confirmButton.text}
                </Button>
                <p>{alternativeMessage}</p>
              </section>
            )}
          </Col>

          {(unselectedRolesWithAccess.length > 0) && (
            <Col width="two-thirds">
              <div className="section">
                {unselectedRolesWithAccess
                  .map(role => (
                    <Card
                      key={`role_with_access_${role.role_id}`}
                      data-testid="eps-card"
                      className="nhsuk-card nhsuk-card--primary nhsuk-u-margin-bottom-4"
                      tabIndex={0}
                      onKeyDown={(e) => handleCardKeyDown(e, role)}
                      onClick={(e) => handleCardClick(e, role)}
                      style={{cursor: "pointer"}}
                    >
                      <Card.Content>
                        <div className="eps-card__layout">
                          <div>
                            <Card.Heading className="nhsuk-heading-s eps-card__org-name">
                              {role.org_name || noOrgName}
                              <br />
                              (ODS: {role.org_code || noODSCode})
                            </Card.Heading>
                            <Card.Description className="nhsuk-u-margin-top-2">
                              {role.role_name || noRoleName}
                            </Card.Description>
                          </div>
                          <div className="eps-card__address">
                            <Card.Description>
                              {(role.site_address || contentText.noAddress)
                                .split("\n")
                                .map((line: string, index: number) => (
                                  <span key={index}>
                                    {line}
                                    <br />
                                  </span>
                                ))}
                            </Card.Description>
                          </div>
                        </div>
                      </Card.Content>
                    </Card>
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
                    {auth.rolesWithoutAccess.map(
                      role => (
                        <Table.Row key={`role_without_access_${role.role_id}`}>
                          <Table.Cell data-testid="change-role-name-cell">
                            {role.org_name || noOrgName} (ODS: {role.org_code || noODSCode})
                          </Table.Cell>
                          <Table.Cell data-testid="change-role-role-cell">
                            {role.role_name || noRoleName}
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
