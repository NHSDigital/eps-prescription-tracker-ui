import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"
import {
  Container,
  Col,
  Row,
  Details,
  Table,
  ErrorSummary,
  InsetText
} from "nhsuk-react-components"

import {useAuth} from "@/context/AuthProvider"
import EpsCard from "@/components/EpsCard"
import EpsSpinner from "@/components/EpsSpinner"
import {RoleDetails} from "@cpt-ui-common/common-types"
import {Button} from "./ReactRouterButton"
import {FRONTEND_PATHS} from "@/constants/environment"
import {getSearchParams} from "@/helpers/getSearchParams"
import {logger} from "@/helpers/logger"

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

  const [loginInfoMessage, setLoginInfoMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const redirecting = useRef(false)

  const [roleCardPropsWithAccess, setRoleCardPropsWithAccess] = useState<Array<RolesWithAccessProps>>([])
  const [roleCardPropsWithoutAccess, setRoleCardPropsWithoutAccess] = useState<Array<RolesWithoutAccessProps>>([])

  useEffect(() => {
    // Transform roles data for display
    setRoleCardPropsWithAccess((!auth.hasNoAccess)
      ? auth.rolesWithAccess.map((role: RoleDetails, index) => ({
        uuid: `role_with_access_${index}`,
        role,
        link: FRONTEND_PATHS.YOUR_SELECTED_ROLE
      }))
      : []
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
        auth.clearAuthState()
        navigate(FRONTEND_PATHS.LOGIN)
      }
    } else {
      redirecting.current = false
    }
  }, [auth.isSigningIn])

  useEffect(() => {
    if (auth.hasSingleRoleAccess && auth.isSignedIn) {
      navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    }
  }, [auth.hasSingleRoleAccess, auth.isSignedIn])

  // Set login message when selected role is available
  useEffect(() => {
    if (!loginInfoMessage && auth.selectedRole) {
      setLoginInfoMessage(
        `You are currently logged in at ${auth.selectedRole.org_name || noOrgName} ` +
        `(ODS: ${auth.selectedRole.org_code || noODSCode}) with ${auth.selectedRole.role_name || noRoleName}.`
      )
    }
  }, [auth.selectedRole, loginInfoMessage])

  // Show spinner while loading or redirecting
  if (redirecting.current) {
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
      <Container role="contentinfo">
        <Row>
          <Col width="two-thirds">
            <h1 className="nhsuk-heading-xl">
              <span role="text" data-testid="eps_header_selectYourRole">
                <span className="nhsuk-title">
                  {auth.hasNoAccess ? titleNoAccess : title}
                </span>
                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                  <span className="nhsuk-u-visually-hidden"> - </span>
                  {(!auth.hasNoAccess) && caption}
                </span>
              </span>
            </h1>

            {auth.hasNoAccess && <p>{captionNoAccess}</p>}
            {auth.selectedRole && (
              <section aria-label="Login Information">
                <InsetText data-testid="eps_select_your_role_pre_role_selected">
                  <span className="nhsuk-u-visually-hidden">
                    {insetText.visuallyHidden}
                  </span>
                  {loginInfoMessage && (
                    <p
                      dangerouslySetInnerHTML={{__html: loginInfoMessage}}
                    ></p>
                  )}
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

          {(!auth.hasNoAccess) && (roleCardPropsWithAccess.length > 0) && (
            <Col width="two-thirds">
              <div className="section">
                {roleCardPropsWithAccess
                  .filter((duplicateRole) => duplicateRole.role.role_id !== auth.selectedRole?.role_id)
                  .map((roleCardProps: RolesWithAccessProps) => (
                    <EpsCard {...roleCardProps} key={roleCardProps.uuid} />
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
    </main>
  )
}
