import React, {useContext, useEffect, useState} from "react"
import {Link, useNavigate, useLocation} from "react-router-dom"
import {HeaderWithLogo} from "nhsuk-react-components-extensions"
import {
  HEADER_FEEDBACK_BUTTON,
  HEADER_FEEDBACK_TARGET,
  HEADER_CHANGE_ROLE_BUTTON,
  HEADER_CHANGE_ROLE_TARGET,
  HEADER_SELECT_YOUR_ROLE_BUTTON,
  HEADER_SELECT_YOUR_ROLE_TARGET,
  HEADER_LOG_OUT_BUTTON,
  HEADER_SERVICE
} from "@/constants/ui-strings/HeaderStrings"
import {AuthContext} from "@/context/AuthProvider"
import {useAuth} from "@/context/AuthProvider"

import {EpsLogoutModal} from "@/components/EpsLogoutModal"
import {normalizePath} from "@/helpers/utils"
import {FRONTEND_PATHS, AUTH_CONFIG} from "@/constants/environment"
import {getHomeLink} from "@/helpers/loginFunctions"
import {signOut} from "@/helpers/logout"

export default function AppHeader() {
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
      !authContext.hasSingleRoleAccess() &&
      !authContext.selectedRole
    )

    // Show "Change role" link (if not single access)
    setShouldShowChangeRole(
      path !== FRONTEND_PATHS.SESSION_SELECTION &&
      path !== FRONTEND_PATHS.SELECT_YOUR_ROLE &&
      path !== FRONTEND_PATHS.CHANGE_YOUR_ROLE &&
      path !== FRONTEND_PATHS.LOGOUT &&
      isSignedIn &&
      !authContext.hasSingleRoleAccess() &&
      authContext.selectedRole !== undefined
    )

    // Show the "Logout" link only if the user is signed in
    setShouldShowLogoutLink(Boolean(auth?.isSignedIn))

    // Show the "Exit" button under these conditions
    setShouldShowExitButton(
      (path === FRONTEND_PATHS.LOGOUT && !auth?.isSignedIn) ||
      (path === FRONTEND_PATHS.SELECT_YOUR_ROLE && authContext.rolesWithAccess.length === 0) ||
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

  // Trigger resize event on mobile to make the header library recalculate overflow
  useEffect(() => {
    const isMobile = window.innerWidth <= 900
    if (isMobile) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event("resize"))
      }, 50)

      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <>
      <HeaderWithLogo>
        <Link
          to={getHomeLink(auth?.isSignedIn || false)}
          onClick={redirectToLogin}
          className="combined-logo-and-service-name"
          style={{display: "flex", alignItems: "center"}}
          data-testid="eps_header_logoLink"
          id="prescription-tracker-header-link"
        >
          <HeaderWithLogo.Logo
            aria-label="Prescription Tracker (Pilot)"
            aria-labelledby="prescription-tracker-header-link"
          />
          <HeaderWithLogo.ServiceName
            data-testid="eps_header_serviceName">
            {HEADER_SERVICE}
          </HeaderWithLogo.ServiceName>
        </Link>
        <HeaderWithLogo.Nav id="header-navigation">
          {shouldShowSelectRole && (
            <HeaderWithLogo.NavItem
              as="a"
              href="#"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                navigate(HEADER_SELECT_YOUR_ROLE_TARGET)
              }}
              data-testid="eps_header_selectYourRoleLink"
            >
              <span className="text">{HEADER_SELECT_YOUR_ROLE_BUTTON}</span>
            </HeaderWithLogo.NavItem>
          )}

          {shouldShowChangeRole && (
            <HeaderWithLogo.NavItem
              as="a"
              href="#"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                navigate(HEADER_CHANGE_ROLE_TARGET)
              }}
              data-testid="eps_header_changeRoleLink"
            >
              <span className="text">{HEADER_CHANGE_ROLE_BUTTON}</span>
            </HeaderWithLogo.NavItem>
          )}

          <HeaderWithLogo.NavItem
            href={HEADER_FEEDBACK_TARGET}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="eps_header_feedbackLink"
          >
            <span className="text">{HEADER_FEEDBACK_BUTTON}</span>
          </HeaderWithLogo.NavItem>

          {shouldShowLogoutLink && (
            <HeaderWithLogo.NavItem
              as="a"
              href="#"
              onClick={handleLogoutClick}
              data-testid="eps_header_logout"
            >
              <span className="text">{HEADER_LOG_OUT_BUTTON}</span>
            </HeaderWithLogo.NavItem>
          )}

          {shouldShowExitButton && (
            <HeaderWithLogo.NavItem
              as="a"
              href="#"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                navigate(getHomeLink(false))
              }}
              data-testid="eps_header_exit"
            >
              <span className="text">Exit</span>
            </HeaderWithLogo.NavItem>
          )}

          <HeaderWithLogo.NavDropdownMenu dropdownText="More" />
        </HeaderWithLogo.Nav>
      </HeaderWithLogo>

      <EpsLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  )
}
