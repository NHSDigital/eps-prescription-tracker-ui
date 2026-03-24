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

import "../styles/roleselectionpage.scss"

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

interface AuthContextType {
  userDetails?: {
    sub?: string
    name?: string
  }
  sessionId?: string
  selectedRole?: RoleDetails | null
  user: string | null
  isSignedIn: boolean
  isSigningIn: boolean
  isSigningOut: boolean
  isConcurrentSession: boolean
  error: string | null
  invalidSessionCause?: string
  rolesWithAccess: Array<RoleDetails>
  rolesWithoutAccess: Array<RoleDetails>
  updateSelectedRole: (role: RoleDetails) => Promise<void>
  hasSingleRoleAccess: () => boolean
}

// Location interface
interface LocationType {
  pathname: string
}

// Props for the extracted RoleCard component
interface RoleCardProps {
  roleCardProps: RolesWithAccessProps
  isThisCardSelected: boolean
  isOtherCardDisabled: boolean
  onCardClick: (e: React.MouseEvent, roleCardProps: RolesWithAccessProps) => void
  onCardKeyDown: (e: React.KeyboardEvent, roleCardProps: RolesWithAccessProps) => void
  noOrgName: string
  noODSCode: string
  noRoleName: string
}

function RoleCard({
  roleCardProps,
  isThisCardSelected,
  isOtherCardDisabled,
  onCardClick,
  onCardKeyDown,
  noOrgName,
  noODSCode,
  noRoleName
}: RoleCardProps) {
  const cardClassName = React.useMemo(() => {
    let className = "nhsuk-card nhsuk-card--primary nhsuk-u-margin-bottom-4"
    if (isOtherCardDisabled) className += " nhsuk-card--disabled"
    if (isThisCardSelected) className += " nhsuk-card--selected"
    return className
  }, [isOtherCardDisabled, isThisCardSelected])

  const cardStyle = React.useMemo(() => ({
    cursor: isOtherCardDisabled ? "not-allowed" : "pointer",
    opacity: isOtherCardDisabled ? 0.5 : 1,
    pointerEvents: isOtherCardDisabled ? "none" as const : "auto" as const
  }), [isOtherCardDisabled])

  const linkStyle = React.useMemo(() => ({
    textDecoration: "none",
    color: "inherit",
    pointerEvents: isOtherCardDisabled ? "none" as const : "auto" as const,
    cursor: isOtherCardDisabled ? "not-allowed" : "pointer"
  }), [isOtherCardDisabled])

  const linkClassName = React.useMemo(() => {
    let className = ""
    if (isOtherCardDisabled) className += "disabled-card-link "
    if (isThisCardSelected) className += "selected-card-link"
    return className.trim()
  }, [isOtherCardDisabled, isThisCardSelected])

  return (
    <Card
      key={roleCardProps.uuid}
      data-testid="eps-card"
      className={cardClassName}
      tabIndex={isOtherCardDisabled ? -1 : 0}
      onKeyDown={isOtherCardDisabled ? undefined : (e) => onCardKeyDown(e, roleCardProps)}
      onClick={isOtherCardDisabled ? undefined : (e) => onCardClick(e, roleCardProps)}
      style={cardStyle}
      role="button"
      aria-disabled={isOtherCardDisabled}
    >
      <Card.Content>
        {/* anchor tags are used here for accessibility reasons,
       as they more accurately depict if a card is active or disabled for screen readers */}
        <div className="eps-card__layout">
          <div>
            <Card.Heading className="nhsuk-heading-s eps-card__org-name">
              <a
                href="#"
                onClick={isOtherCardDisabled ?
                  (e) => e.preventDefault() :
                  (e) => onCardClick(e, roleCardProps)
                }
                onKeyDown={isOtherCardDisabled ?
                  undefined :
                  (e) => onCardKeyDown(e, roleCardProps)
                }
                style={linkStyle}
                tabIndex={isOtherCardDisabled ? -1 : 0}
                aria-disabled={isOtherCardDisabled}
                role="button"
                className={linkClassName}
              >
                {roleCardProps.role.org_name || noOrgName}
                <br />
                (ODS: {roleCardProps.role.org_code || noODSCode})
              </a>
            </Card.Heading>
            <Card.Description className="nhsuk-u-margin-top-2">
              {roleCardProps.role.role_name || noRoleName}
            </Card.Description>
          </div>
          <RoleCardAddress address={roleCardProps.role.site_address} />
        </div>
      </Card.Content>
    </Card>
  )
}

// Extracted address rendering component
function RoleCardAddress({address}: { address?: string }) {
  const addressLines = React.useMemo(() => {
    const addressText = address || "No address available"
    return addressText.split("\n")
  }, [address])

  return (
    <div className="eps-card__address">
      <Card.Description>
        {addressLines.map((line: string, index: number) => (
          <span key={index}>
            {line}
            <br />
          </span>
        ))}
      </Card.Description>
    </div>
  )
}

// Extracted role cards section component
interface RoleCardsSectionProps {
  rolesWithAccess: Array<RolesWithAccessProps>
  selectedCardId: string | null
  isSelectingRole: boolean
  onCardClick: (e: React.MouseEvent, roleCardProps: RolesWithAccessProps) => void
  onCardKeyDown: (e: React.KeyboardEvent, roleCardProps: RolesWithAccessProps) => void
  noOrgName: string
  noODSCode: string
  noRoleName: string
}

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

interface RolesWithoutAccessSectionProps {
  rolesWithoutAccess: Array<RolesWithoutAccessProps>
  rolesWithoutAccessHeader: string
  roles_without_access_table_title: string
  organisation: string
  role: string
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

interface RoleComponentProps {
  rolesWithAccess: Array<RolesWithAccessProps>
  rolesWithoutAccess: Array<RolesWithoutAccessProps>
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

// Helper function to transform roles data for display
function transformRolesData(
  rolesWithAccess: Array<RoleDetails>,
  rolesWithoutAccess: Array<RoleDetails>,
  selectedRole: RoleDetails | null | undefined,
  noRoleName: string,
  noOrgName: string,
  noODSCode: string
): RoleComponentProps {
  const rolesWithAccessComponentProps = rolesWithAccess.length === 0
    ? []
    : rolesWithAccess.map((role: RoleDetails, index) => ({
      uuid: `role_with_access_${index}`,
      role,
      link: FRONTEND_PATHS.YOUR_SELECTED_ROLE
    })).filter((duplicateRole) => duplicateRole.role.role_id !== selectedRole?.role_id)

  const rolesWithoutAccessComponentProps = rolesWithoutAccess.map((role, index) => ({
    uuid: `role_without_access_${index}`,
    roleName: role.role_name || noRoleName,
    orgName: role.org_name || noOrgName,
    odsCode: role.org_code || noODSCode
  }))

  return {
    rolesWithAccess: rolesWithAccessComponentProps,
    rolesWithoutAccess: rolesWithoutAccessComponentProps
  }
}

// Helper function to log role chunks for RUM
function logRoleChunks(
  auth: AuthContextType,
  rolesWithAccessComponentProps: Array<RolesWithAccessProps>,
  rolesWithoutAccessComponentProps: Array<RolesWithoutAccessProps>,
  location: LocationType
) {
  if (!auth.userDetails?.sub) return

  const logId = crypto.randomUUID()

  logger.debug("Counts of roles returned vs rendered", {
    logId,
    sessionId: auth.sessionId,
    userId: auth.userDetails.sub,
    pageName: location.pathname,
    currentlySelectedRole: !!auth.selectedRole,
    returnedRolesWithAccessCount: auth.rolesWithAccess.length,
    returnedRolesWithoutAccessCount: auth.rolesWithoutAccess.length,
    renderedRolesWithAccessCount: rolesWithAccessComponentProps.length,
    renderedRolesWithoutAccessCount: rolesWithoutAccessComponentProps.length
  }, true)

  logger.debug("Auth context for rendered roles", {
    logId,
    sessionId: auth.sessionId,
    userId: auth.userDetails.sub,
    pageName: location.pathname,
    authContext: {
      cognitoUsername: auth.user,
      name: auth.userDetails.name,
      currentlySelectedRole: auth.selectedRole,
      isSignedIn: auth.isSignedIn,
      isSigningIn: auth.isSigningIn,
      isSigningOut: auth.isSigningOut,
      isConcurrentSession: auth.isConcurrentSession,
      error: auth.error,
      invalidSessionCause: auth.invalidSessionCause
    }
  }, true)

  const chunkRolesForRumLogs = (
    roles: Array<unknown>, logMessage: string, logId: string, fieldToPopulate: string) => {
    const chunkSize = 4
    const chunks = []
    for (let index = 0; index < roles.length; index += chunkSize) {
      const chunk = roles.slice(index, index + chunkSize)
      chunks.push(chunk)
    }

    for (const [index, chunk] of chunks.entries()){
      logger.debug(logMessage, {
        logId,
        sessionId: auth.sessionId,
        userId: auth.userDetails?.sub,
        pageName: location.pathname,
        totalChunks: chunks.length,
        chunkNo: index+1,
        [fieldToPopulate]: chunk
      }, true)
    }
  }

  chunkRolesForRumLogs(auth.rolesWithAccess, "Returned roles with access", logId, "returnedRolesWithAccess")
  chunkRolesForRumLogs(auth.rolesWithoutAccess, "Returned roles without access", logId, "returnedRolesWithoutAccess")
  chunkRolesForRumLogs(rolesWithAccessComponentProps, "Rendered roles with access", logId,
    "renderedRolesWithAccessProps")
  chunkRolesForRumLogs(rolesWithoutAccessComponentProps, "Rendered roles without access", logId,
    "renderedRolesWithoutAccessProps")
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
  const location = {pathname: window.location.pathname}
  const redirecting = useRef(false)
  const [isSelectingRole, setIsSelectingRole] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [roleComponentProps, setRoleComponentProps] = useState<RoleComponentProps>({
    rolesWithAccess: [],
    rolesWithoutAccess: []
  })

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
        handleRestartLogin(auth, invalidSessionCause)
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

    logRoleChunks(auth, transformedData.rolesWithAccess, transformedData.rolesWithoutAccess, location)
    setRoleComponentProps(transformedData)
  }, [auth.rolesWithAccess, auth.rolesWithoutAccess])

  // Handle auto-redirect for single role
  useEffect(() => {
    if (auth.isSigningIn) {
      const {codeParams, stateParams} = getSearchParams(window)
      if (codeParams && stateParams) {
        redirecting.current = true
        return
      } else {
        handleRestartLogin(auth, "NoSearchParams")
      }
    } else {
      redirecting.current = false
    }
  }, [auth.isSigningIn])

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

  const shouldShowLoading = redirecting.current || auth.isSigningOut
  if (shouldShowLoading) {
    return <MainLayout><LoadingPage /></MainLayout>
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

// Extracted error state component
interface ErrorStateProps {
  error: string
  errorDuringRoleSelection: string
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

// Extracted main layout wrapper
interface MainLayoutProps {
  children: React.ReactNode
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

// Extracted user info section component
interface UserInfoSectionProps {
  auth: AuthContextType
  title: string
  titleNoAccess: string
  caption: string
  captionNoAccess: string
  insetText: {
    loggedInTemplate: string
  }
  confirmButton: {
    link: string
    text: string
  }
  alternativeMessage: string
  isSelectingRole: boolean
  noOrgName: string
  noODSCode: string
  noRoleName: string
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
            to={confirmButton.link}
            data-testid="confirm-and-continue"
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
