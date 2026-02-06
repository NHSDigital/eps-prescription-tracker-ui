import React, {useState, useEffect, useRef} from "react"
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
import {RoleDetails} from "@cpt-ui-common/common-types"
import {Button} from "./ReactRouterButton"
import {FRONTEND_PATHS} from "@/constants/environment"
import {getSearchParams} from "@/helpers/getSearchParams"
import {logger} from "@/helpers/logger"
import {usePageTitle} from "@/hooks/usePageTitle"
import axios from "axios"
import {handleRestartLogin} from "@/helpers/logout"
import {CHANGE_YOUR_ROLE_PAGE_TEXT} from "@/constants/ui-strings/ChangeRolePageStrings"
import LoadingPage from "@/pages/LoadingPage"

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
    pageTitle: string
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
  const redirecting = useRef(false)

  const [roleCardPropsWithAccess, setRoleCardPropsWithAccess] = useState<Array<RolesWithAccessProps>>([])
  const [roleCardPropsWithoutAccess, setRoleCardPropsWithoutAccess] = useState<Array<RolesWithoutAccessProps>>([])

  usePageTitle(auth.rolesWithAccess.length === 0
    ? CHANGE_YOUR_ROLE_PAGE_TEXT.NO_ACCESS_pageTitle
    : contentText.pageTitle)

  const handleSetSelectedRole = async (
    e: React.MouseEvent | React.KeyboardEvent,
    roleCardProps: RolesWithAccessProps
  ) => {
    e.preventDefault()
    try {
      await auth.updateSelectedRole(roleCardProps.role)
      navigate(roleCardProps.link)
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401)) {
        const invalidSessionCause = err.response?.data?.invalidSessionCause
        handleRestartLogin(auth, invalidSessionCause)
        return
      }
      logger.error("Error selecting role:", err)
    }
  }

  const handleCardKeyDown = (e: React.KeyboardEvent, roleCardProps: RolesWithAccessProps) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleSetSelectedRole(e, roleCardProps)
    }
  }

  const handleCardClick = (e: React.MouseEvent, roleCardProps: RolesWithAccessProps) => {
    e.preventDefault()
    handleSetSelectedRole(e, roleCardProps)
  }

  useEffect(() => {
    // Transform roles data for display
    setRoleCardPropsWithAccess(auth.rolesWithAccess.length === 0
      ? []
      : auth.rolesWithAccess.map((role: RoleDetails, index) => ({
        uuid: `role_with_access_${index}`,
        role,
        link: FRONTEND_PATHS.YOUR_SELECTED_ROLE
      }))
    )

    setRoleCardPropsWithoutAccess(auth.rolesWithoutAccess.map((role, index) => ({
      uuid: `role_without_access_${index}`,
      roleName: role.role_name || noRoleName,
      orgName: role.org_name || noOrgName,
      odsCode: role.org_code || noODSCode
    })))

    logger.warn("RoleCardPropsWithAccess length: ", {roleCardPropsWithAccess, error: auth.error})
  }, [auth.rolesWithAccess, auth.rolesWithoutAccess])

  // Handle auto-redirect for single role
  useEffect(() => {
    if (auth.isSigningIn) {
      const {codeParams, stateParams} = getSearchParams(window)
      if (codeParams && stateParams) {
        // we are in a redirect from login flow so carry on
        redirecting.current = true
        return
      } else {
        // something has gone wrong so go back to login
        handleRestartLogin(auth, "NoSearchParams")
      }
    } else {
      redirecting.current = false
    }
  }, [auth.isSigningIn])

  useEffect(() => {
    if (auth.hasSingleRoleAccess() && auth.isSignedIn) {
      navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    }
  }, [auth.hasSingleRoleAccess, auth.isSignedIn])

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

  return (
    <main
      id="main-content"
      className="nhsuk-main-wrapper"
      data-testid="eps_roleSelectionComponent"
    >
      {
        redirecting.current || auth.isSigningOut ?
          <LoadingPage /> :
          <Container role="contentinfo">
            <Row>
              <Col width="two-thirds">
                <h1 className="nhsuk-heading-xl">
                  <span role="text" data-testid="eps_header_selectYourRole">
                    <span className="nhsuk-title">
                      {auth.rolesWithAccess.length === 0 ? titleNoAccess : title}
                    </span>
                    <span className="nhsuk-caption-l nhsuk-caption--bottom">
                      <span className="nhsuk-u-visually-hidden"> - </span>
                      {(auth.rolesWithAccess.length > 0) && caption}
                    </span>
                  </span>
                </h1>

                {auth.rolesWithAccess.length === 0 && <p>{captionNoAccess}</p>}
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

              {(auth.rolesWithAccess.length > 0) && (roleCardPropsWithAccess.length > 0) && (
                <Col width="two-thirds">
                  <div className="section">
                    {roleCardPropsWithAccess
                      .filter((duplicateRole) => duplicateRole.role.role_id !== auth.selectedRole?.role_id)
                      .map((roleCardProps: RolesWithAccessProps) => (
                        <Card
                          key={roleCardProps.uuid}
                          data-testid="eps-card"
                          className="nhsuk-card nhsuk-card--primary nhsuk-u-margin-bottom-4"
                          tabIndex={0}
                          onKeyDown={(e) => handleCardKeyDown(e, roleCardProps)}
                          onClick={(e) => handleCardClick(e, roleCardProps)}
                          style={{cursor: "pointer"}}
                        >
                          <Card.Content>
                            <div className="eps-card__layout">
                              <div>
                                <Card.Heading className="nhsuk-heading-s eps-card__org-name">
                                  {roleCardProps.role.org_name || noOrgName}
                                  <br />
                                  (ODS: {roleCardProps.role.org_code || noODSCode})
                                </Card.Heading>
                                <Card.Description className="nhsuk-u-margin-top-2">
                                  {roleCardProps.role.role_name || noRoleName}
                                </Card.Description>
                              </div>
                              <div className="eps-card__address">
                                <Card.Description>
                                  {(roleCardProps.role.site_address || contentText.noAddress)
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
                        {roleCardPropsWithoutAccess.map(
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
      }
    </main>
  )
}
