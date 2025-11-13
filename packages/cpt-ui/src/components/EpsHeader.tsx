import React, {
  Fragment,
  useContext,
  useEffect,
  useState
} from "react"
import {Link, useNavigate, useLocation} from "react-router-dom"
import {Header} from "nhsuk-react-components"
import {
  HEADER_SERVICE,
  HEADER_EXIT_BUTTON,
  HEADER_EXIT_TARGET,
  HEADER_CHANGE_ROLE_BUTTON,
  HEADER_CHANGE_ROLE_TARGET,
  HEADER_SELECT_YOUR_ROLE_TARGET,
  HEADER_SELECT_YOUR_ROLE_BUTTON,
  HEADER_FEEDBACK_BUTTON,
  HEADER_FEEDBACK_TARGET,
  HEADER_LOG_OUT_BUTTON
} from "@/constants/ui-strings/HeaderStrings"

import {AuthContext} from "@/context/AuthProvider"
import {useAuth} from "@/context/AuthProvider"

import {EpsLogoutModal} from "@/components/EpsLogoutModal"
import {normalizePath} from "@/helpers/utils"
import {FRONTEND_PATHS, AUTH_CONFIG} from "@/constants/environment"
import {getHomeLink} from "@/helpers/loginFunctions"
import {signOut} from "@/helpers/logout"

const NHS_LOGO_PATH =
  "M3.9 1.5h4.4l2.6 9h.1l1.8-9h3.3l-2.8 13H9l-2.7-9h-.1l-1.8 9H1.1" +
  "M17.3 1.5h3.6l-1 4.9h4L25 1.5h3.5l-2.7 13h-3.5l1.1-5.6h-4.1l-1.2 5.6h-3.4" +
  "M37.7 4.4c-.7-.3-1.6-.6-2.9-.6-1.4 0-2.5.2-2.5 1.3 0 1.8 5.1 1.2 5.1 5.1 0 " +
  "3.6-3.3 4.5-6.4 4.5-1.3 0-2.9-.3-4-.7l.8-2.7c.7.4 2.1.7 3.2.7s2.8-.2 " +
  "2.8-1.5c0-2.1-5.1-1.3-5.1-5 0-3.4 2.9-4.4 5.8-4.4 1.6 0 3.1.2 4 .6"

export default function EpsHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  // TODO: REFACTOR REQUIRED
  // We should only useAuth instead of useContext...
  const auth = useContext(AuthContext)
  const authContext = useAuth()

  // Individual states to control link visibility:
  const [shouldShowSelectRole, setShouldShowSelectRole] = useState(false)
  const [shouldShowChangeRole, setShouldShowChangeRole] = useState(false)
  const [shouldShowLogoutLink, setShouldShowLogoutLink] = useState(false)
  const [shouldShowExitButton, setShouldShowExitButton] = useState(false)

  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Move all conditional logic into one place
  useEffect(() => {
    const isSignedIn = auth?.isSignedIn as boolean

    const path = normalizePath(location.pathname)

    // Show "Select your role" link
    setShouldShowSelectRole(
      path !== FRONTEND_PATHS.SESSION_SELECTION &&
      path !== FRONTEND_PATHS.SELECT_YOUR_ROLE &&
      path !== FRONTEND_PATHS.CHANGE_YOUR_ROLE &&
      path !== FRONTEND_PATHS.LOGOUT &&
      path !== FRONTEND_PATHS.SESSION_LOGGED_OUT &&
      isSignedIn &&
      !authContext.hasSingleRoleAccess &&
      !authContext.selectedRole
    )

    // Show "Change role" link (if not single access)
    setShouldShowChangeRole(
      path !== FRONTEND_PATHS.SESSION_SELECTION &&
      path !== FRONTEND_PATHS.SELECT_YOUR_ROLE &&
      path !== FRONTEND_PATHS.CHANGE_YOUR_ROLE &&
      path !== FRONTEND_PATHS.LOGOUT &&
      isSignedIn &&
      !authContext.hasSingleRoleAccess &&
      authContext.selectedRole !== undefined
    )

    // Show the "Logout" link only if the user is signed in
    setShouldShowLogoutLink(Boolean(auth?.isSignedIn))

    // Show the "Exit" button under these conditions
    setShouldShowExitButton(
      (path === FRONTEND_PATHS.LOGOUT && !auth?.isSignedIn) ||
      (path === FRONTEND_PATHS.SELECT_YOUR_ROLE && authContext.hasNoAccess) ||
      (path === "/notfound")
    )
  }, [location, auth, authContext])

  const redirectToLogin = async (e: React.MouseEvent | React.KeyboardEvent) => {
    // Naked href don't respect the router, so this overrides that
    e.preventDefault()
    navigate(getHomeLink(auth?.isSignedIn || false))
  }

  const handleLogoutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setShowLogoutModal(true)
  }

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false)
    signOut(authContext, AUTH_CONFIG.REDIRECT_SIGN_OUT)
  }

  return (
    <Fragment>
      <Header transactional className="masthead" id="eps-header">
        <a
          href="#main-content"
          className="nhsuk-skip-link"
          data-testid="eps_header_skipLink"
        >
          Skip to main content
        </a>
        <Header.Container className="masthead-container">
          {/* Combined logo and service name in a single link for accessibility */}
          <Link
            to={getHomeLink(auth?.isSignedIn || false)}
            onClick={redirectToLogin}
            className="nhsuk-header__link nhsuk-header__link--service"
            data-testid="eps_header_logoServiceLink"
            aria-label={`${HEADER_SERVICE} - Go to homepage`}
          >
            <span className="nhsuk-header__logo">
              <svg
                className="nhsuk-logo nhsuk-logo--white"
                xmlns="http://www.w3.org/2000/svg"
                role="presentation"
                focusable="false"
                viewBox="0 0 40 16"
              >
                <path fill="#fff" d="M0 0h40v16H0z"/>
                <path
                  fill="#005eb8"
                  d={NHS_LOGO_PATH}
                />
              </svg>
            </span>
            <span className="nhsuk-header__service-name">
              {HEADER_SERVICE}
            </span>
          </Link>
          <Header.Content />
        </Header.Container>

        <Header.Nav className="masthead-nav">
          {/* Select your role */}
          {shouldShowSelectRole && (
            <Header.NavItem
              to={HEADER_SELECT_YOUR_ROLE_TARGET}
              data-testid="eps_header_selectYourRoleLink"
            >
              {HEADER_SELECT_YOUR_ROLE_BUTTON}
            </Header.NavItem>
          )}

          {/* Change role */}
          {shouldShowChangeRole && (
            <Header.NavItem
              to={HEADER_CHANGE_ROLE_TARGET}
              data-testid="eps_header_changeRoleLink"
            >
              {HEADER_CHANGE_ROLE_BUTTON}
            </Header.NavItem>
          )}

          {/* Give feedback (opens in new tab) */}
          <Header.NavItem
            href={HEADER_FEEDBACK_TARGET}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="eps_header_feedbackLink"
          >
            {HEADER_FEEDBACK_BUTTON}
          </Header.NavItem>

          {/* Log out */}
          {shouldShowLogoutLink && (
            <Header.NavItem
              to={FRONTEND_PATHS.LOGOUT}
              data-testid="eps_header_logout"
              onClick={handleLogoutClick}
            >
              {HEADER_LOG_OUT_BUTTON}
            </Header.NavItem>
          )}

          {/* Exit button */}
          {shouldShowExitButton && (
            <Header.NavItem
              to={HEADER_EXIT_TARGET}
              data-testid="eps_header_exit"
            >
              {HEADER_EXIT_BUTTON}
            </Header.NavItem>
          )}

          <Header.NavDropdownMenu dropdownText="Menu" />
        </Header.Nav>
      </Header>

      <EpsLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </Fragment>
  )
}
