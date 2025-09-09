import React, {useContext, useEffect, useState} from "react"
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
import {ENV_CONFIG, FRONTEND_PATHS} from "@/constants/environment"
import {getHomeLink} from "@/helpers/loginFunctions"

const baseUrl = ENV_CONFIG.BASE_URL

export default function EpsHeader() {
  const navigate = useNavigate()
  const location = useLocation()
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
    navigate(FRONTEND_PATHS.LOGOUT, {replace: true})
  }

  return (
    <>
      <Header transactional className="masthead" id="eps-header">
        <Header.Container className="masthead-container">
          <Header.Logo href={`${baseUrl}${getHomeLink(auth?.isSignedIn || false)}`} />
          <Link
            to={getHomeLink(auth?.isSignedIn || false)}
            onClick={redirectToLogin}
            className="combined-logo-and-service-name"
            style={{
              display: "flex"
            }}
            data-testid="eps_header_logoLink"
          >
          </Link>
          <Header.ServiceName
            data-testid="eps_header_serviceName"
            href={`${baseUrl}${getHomeLink(auth?.isSignedIn || false)}`}>
            {HEADER_SERVICE}
          </Header.ServiceName>
          <Header.Content />
        </Header.Container>

        <Header.Nav className="masthead-nav">
          {/* Select your role */}
          <div>
            {shouldShowSelectRole && (
              <li className="nhsuk-header__navigation-item">
                <Link
                  className="nhsuk-header__navigation-link"
                  to={HEADER_SELECT_YOUR_ROLE_TARGET}
                  data-testid="eps_header_selectYourRoleLink"
                >
                  {HEADER_SELECT_YOUR_ROLE_BUTTON}
                </Link>
              </li>
            )}
          </div>

          {/* Change role */}
          <div>
            {shouldShowChangeRole && (
              <li className="nhsuk-header__navigation-item">
                <Link
                  className="nhsuk-header__navigation-link"
                  to={HEADER_CHANGE_ROLE_TARGET}
                  data-testid="eps_header_changeRoleLink"
                >
                  {HEADER_CHANGE_ROLE_BUTTON}
                </Link>
              </li>
            )}
          </div>

          {/* Give feedback (opens in new tab) */}
          <div>
            <Header.NavItem
              href={HEADER_FEEDBACK_TARGET}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="eps_header_feedbackLink"
            >
              {HEADER_FEEDBACK_BUTTON}
            </Header.NavItem>
          </div>

          {/* Log out */}
          <div>
            {shouldShowLogoutLink && (
              <li className="nhsuk-header__navigation-item">
                <Link
                  className="nhsuk-header__navigation-link"
                  to={FRONTEND_PATHS.LOGOUT}
                  data-testid="eps_header_logout"
                  onClick={handleLogoutClick}
                >
                  {HEADER_LOG_OUT_BUTTON}
                </Link>
              </li>
            )}
          </div>

          {/* Exit button */}
          <div>
            {shouldShowExitButton && (
              <li className="nhsuk-header__navigation-item">
                <Link
                  className="nhsuk-header__navigation-link"
                  to={HEADER_EXIT_TARGET}
                  data-testid="eps_header_exit"
                >
                  {HEADER_EXIT_BUTTON}
                </Link>
              </li>
            )}
          </div>

          <Header.NavDropdownMenu dropdownText="Menu" />
        </Header.Nav>
      </Header>

      <EpsLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  )
}
