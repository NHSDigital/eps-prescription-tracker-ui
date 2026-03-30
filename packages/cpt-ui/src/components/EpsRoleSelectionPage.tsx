import React, {useState, useEffect} from "react"
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

import "../styles/roleselectionpage.scss"

import {useAuth} from "@/context/AuthProvider"
import {Button} from "./ReactRouterButton"
import {ENV_CONFIG, FRONTEND_PATHS} from "@/constants/environment"
import {logger} from "@/helpers/logger"
import {usePageTitle} from "@/hooks/usePageTitle"
import axios from "axios"
import {handleSignoutEvent} from "@/helpers/logout"
import {CHANGE_YOUR_ROLE_PAGE_TEXT} from "@/constants/ui-strings/ChangeRolePageStrings"
import {
  RolesWithAccessProps,
  RolesWithoutAccessProps,
  RoleCardsSectionProps,
  RolesWithoutAccessSectionProps,
  RoleComponentProps,
  RoleSelectionPageProps,
  ErrorStateProps,
  UserInfoSectionProps,
  MainLayoutProps
} from "./EpsRoleSelectionPage.types"
import {transformRolesData, logRoleChunks} from "./EpsRoleSelectionPage.utils"
import {RoleCard} from "./RoleCard"

function RoleCardsSection({
  rolesWithAccess,
  selectedCardId,
  isSelectingRole,
  onCardClick,
  onCardKeyDown,
  noOrgName,
  noODSCode,
  noRoleName
}: RoleCardsSectionProps) {
  return (
    <Col width="two-thirds">
      <div className="section">
        {rolesWithAccess.map((roleCardProps: RolesWithAccessProps) => {
          const isThisCardSelected = selectedCardId === roleCardProps.uuid
          const isOtherCardDisabled = isSelectingRole && !isThisCardSelected

          return (
            <RoleCard
              key={roleCardProps.uuid}
              roleCardProps={roleCardProps}
              isThisCardSelected={isThisCardSelected}
              isOtherCardDisabled={isOtherCardDisabled}
              onCardClick={onCardClick}
              onCardKeyDown={onCardKeyDown}
              noOrgName={noOrgName}
              noODSCode={noODSCode}
              noRoleName={noRoleName}
            />
          )
        })}
      </div>
    </Col>
  )
}

function RolesWithoutAccessSection({
  rolesWithoutAccess,
  rolesWithoutAccessHeader,
  roles_without_access_table_title,
  organisation,
  role
}: RolesWithoutAccessSectionProps) {
  return (
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
              {rolesWithoutAccess.map((roleItem: RolesWithoutAccessProps) => (
                <Table.Row key={roleItem.uuid}>
                  <Table.Cell data-testid="change-role-name-cell">
                    {roleItem.orgName} (ODS: {roleItem.odsCode})
                  </Table.Cell>
                  <Table.Cell data-testid="change-role-role-cell">
                    {roleItem.roleName}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Details.Text>
      </Details>
    </Col>
  )
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
  const location = {pathname: globalThis.location.pathname}
  const [isSelectingRole, setIsSelectingRole] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [roleComponentProps, setRoleComponentProps] = useState<RoleComponentProps>({
    rolesWithAccess: [],
    rolesWithoutAccess: []
  })
  const [sentRumRoleLogs, setSentRumRoleLogs] = useState<boolean>(false)

  usePageTitle(auth.rolesWithAccess.length === 0
    ? CHANGE_YOUR_ROLE_PAGE_TEXT.NO_ACCESS_pageTitle
    : contentText.pageTitle)

  const handleSetSelectedRole = async (
    e: React.MouseEvent | React.KeyboardEvent,
    roleCardProps: RolesWithAccessProps
  ) => {
    e.preventDefault()

    if (isSelectingRole) return

    setIsSelectingRole(true)
    setSelectedCardId(roleCardProps.uuid)

    try {
      await auth.updateSelectedRole(roleCardProps.role)
      navigate(roleCardProps.link)
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401)) {
        const invalidSessionCause = err.response?.data?.invalidSessionCause
        handleSignoutEvent(auth, navigate, "RoleSelection Call Failure", invalidSessionCause)
        return
      }
      logger.error("Error selecting role:", err)
      setIsSelectingRole(false)
      setSelectedCardId(null)
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

  const onConfirmRole = () => {
    if(location.pathname === `/${ENV_CONFIG.BASE_PATH}${FRONTEND_PATHS.SELECT_YOUR_ROLE}`) {
      logger.debug("Role confirmed", {
        sessionId: auth.sessionId,
        pageName: location.pathname,
        userId: auth.userDetails?.sub,
        roleName: auth.selectedRole?.role_name,
        roleId: auth.selectedRole?.role_id,
        orgName: auth.selectedRole?.org_name,
        orgCode: auth.selectedRole?.org_code
      }, true)
    }
    navigate(confirmButton.link)
  }

  // Transform roles data when auth roles change
  useEffect(() => {
    const transformedData = transformRolesData(
      auth.rolesWithAccess,
      auth.rolesWithoutAccess,
      auth.selectedRole,
      noRoleName,
      noOrgName,
      noODSCode
    )

    logRoleChunks(auth, transformedData.rolesWithAccess,
      transformedData.rolesWithoutAccess, location, sentRumRoleLogs)
    setSentRumRoleLogs(true)
    setRoleComponentProps(transformedData)
  }, [auth.rolesWithAccess, auth.rolesWithoutAccess])

  useEffect(() => {
    if (auth.hasSingleRoleAccess() && auth.isSignedIn) {
      logger.debug("Role confirmed", {
        sessionId: auth.sessionId,
        pageName: location.pathname,
        userId: auth.userDetails?.sub,
        roleName: auth.selectedRole?.role_name,
        roleId: auth.selectedRole?.role_id,
        orgName: auth.selectedRole?.org_name,
        orgCode: auth.selectedRole?.org_code
      }, true)
      navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    }
  }, [auth.hasSingleRoleAccess, auth.isSignedIn])

  // Early returns for error and loading states
  if (auth.error) {
    return <ErrorState error={auth.error} errorDuringRoleSelection={errorDuringRoleSelection} />
  }

  return (
    <MainLayout>
      <Container role="contentinfo">
        <Row>
          <UserInfoSection
            auth={auth}
            title={title}
            titleNoAccess={titleNoAccess}
            caption={caption}
            captionNoAccess={captionNoAccess}
            insetText={insetText}
            confirmButton={confirmButton}
            alternativeMessage={alternativeMessage}
            isSelectingRole={isSelectingRole}
            onConfirmRole={onConfirmRole}
            noOrgName={noOrgName}
            noODSCode={noODSCode}
            noRoleName={noRoleName}
          />
          {(auth.rolesWithAccess.length > 0) && (roleComponentProps.rolesWithAccess.length > 0) && (
            <RoleCardsSection
              rolesWithAccess={roleComponentProps.rolesWithAccess}
              selectedCardId={selectedCardId}
              isSelectingRole={isSelectingRole}
              onCardClick={handleCardClick}
              onCardKeyDown={handleCardKeyDown}
              noOrgName={noOrgName}
              noODSCode={noODSCode}
              noRoleName={noRoleName}
            />
          )}
          <RolesWithoutAccessSection
            rolesWithoutAccess={roleComponentProps.rolesWithoutAccess}
            rolesWithoutAccessHeader={rolesWithoutAccessHeader}
            roles_without_access_table_title={roles_without_access_table_title}
            organisation={organisation}
            role={role}
          />
        </Row>
      </Container>
    </MainLayout>
  )
}

function ErrorState({error, errorDuringRoleSelection}: ErrorStateProps) {
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

function MainLayout({children}: MainLayoutProps) {
  return (
    <main
      id="main-content"
      className="nhsuk-main-wrapper"
      data-testid="eps_roleSelectionComponent"
    >
      {children}
    </main>
  )
}

function UserInfoSection({
  auth,
  title,
  titleNoAccess,
  caption,
  captionNoAccess,
  insetText,
  confirmButton,
  alternativeMessage,
  isSelectingRole,
  onConfirmRole,
  noOrgName,
  noODSCode,
  noRoleName
}: UserInfoSectionProps) {
  const pageTitle = auth.rolesWithAccess.length === 0 ? titleNoAccess : title
  const showCaption = auth.rolesWithAccess.length > 0

  return (
    <Col width="two-thirds">
      <h1 className="nhsuk-heading-xl">
        <span role="text" data-testid="eps_header_selectYourRole">
          <span className="nhsuk-title">{pageTitle}</span>
          <span className="nhsuk-caption-l nhsuk-caption--bottom">
            <span className="nhsuk-u-visually-hidden"> - </span>
            {showCaption && caption}
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
            data-testid="confirm-and-continue"
            onClick={onConfirmRole}
            disabled={isSelectingRole}
          >
            {confirmButton.text}
          </Button>
          <p>{alternativeMessage}</p>
        </section>
      )}
    </Col>
  )
}
