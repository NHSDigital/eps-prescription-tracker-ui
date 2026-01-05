import React, {useContext, useEffect, useState} from "react"
import {Link, useNavigate, useLocation} from "react-router-dom"
import {AuthContext} from "@/context/AuthProvider"
import {useAuth} from "@/context/AuthProvider"
import {getHomeLink} from "@/helpers/loginFunctions"
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
import {EpsLogoutModal} from "@/components/EpsLogoutModal"
import {normalizePath} from "@/helpers/utils"
import {FRONTEND_PATHS, AUTH_CONFIG} from "@/constants/environment"
import {signOut} from "@/helpers/logout"
import NhsLogo from "@/components/icons/NhsLogo"
import "@/styles/NewHeader.scss"

export default function NewHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useContext(AuthContext)
  const authContext = useAuth()

  const [shouldShowSelectRole, setShouldShowSelectRole] = useState(false)
  const [shouldShowChangeRole, setShouldShowChangeRole] = useState(false)
  const [shouldShowLogoutLink, setShouldShowLogoutLink] = useState(false)
  const [shouldShowExitButton, setShouldShowExitButton] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    const isSignedIn = auth?.isSignedIn as boolean
    const path = normalizePath(location.pathname)

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

    setShouldShowChangeRole(
      path !== FRONTEND_PATHS.SESSION_SELECTION &&
      path !== FRONTEND_PATHS.SELECT_YOUR_ROLE &&
      path !== FRONTEND_PATHS.CHANGE_YOUR_ROLE &&
      path !== FRONTEND_PATHS.LOGOUT &&
      isSignedIn &&
      !authContext.hasSingleRoleAccess &&
      authContext.selectedRole !== undefined
    )

    setShouldShowLogoutLink(Boolean(auth?.isSignedIn))

    setShouldShowExitButton(
      (path === FRONTEND_PATHS.LOGOUT && !auth?.isSignedIn) ||
      (path === FRONTEND_PATHS.SELECT_YOUR_ROLE && authContext.hasNoAccess) ||
      (path === "/notfound")
    )
  }, [location, auth, authContext])

  const redirectToLogin = async (e: React.MouseEvent | React.KeyboardEvent) => {
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
    <>
      <header className="new-header">
        <div className="new-header__content">
          <Link
            to={getHomeLink(auth?.isSignedIn || false)}
            onClick={redirectToLogin}
            className="new-header__logo-link"
            aria-label="Prescription Tracker (Pilot)"
            aria-labelledby="new-prescription-tracker-header-link"
            data-testid="new_header_logoLink"
            id="new-prescription-tracker-header-link"
          >
            <NhsLogo
              className="new-header__logo"
              width="40"
              height="16"
              ariaLabelledBy="new-prescription-tracker-header-link"
              titleId="new-nhs-logo_title"
              variant="white"
            />
            <span className="new-header__service-name" data-testid="new_header_serviceName">
              {HEADER_SERVICE}
            </span>
          </Link>

          <nav className="new-header__nav" id="new-header-navigation">
            {shouldShowSelectRole && (
              <a
                href="#"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  navigate(HEADER_SELECT_YOUR_ROLE_TARGET)
                }}
                className="new-header__nav-item"
                data-testid="new_header_selectYourRoleLink"
              >
                <span className="text">{HEADER_SELECT_YOUR_ROLE_BUTTON}</span>
              </a>
            )}

            {shouldShowChangeRole && (
              <a
                href="#"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  navigate(HEADER_CHANGE_ROLE_TARGET)
                }}
                className="new-header__nav-item"
                data-testid="new_header_changeRoleLink"
              >
                <span className="text">{HEADER_CHANGE_ROLE_BUTTON}</span>
              </a>
            )}

            <a
              href={HEADER_FEEDBACK_TARGET}
              target="_blank"
              rel="noopener noreferrer"
              className="new-header__nav-item"
              data-testid="new_header_feedbackLink"
            >
              <span className="text">{HEADER_FEEDBACK_BUTTON}</span>
            </a>

            {shouldShowLogoutLink && (
              <a
                href="#"
                onClick={handleLogoutClick}
                className="new-header__nav-item"
                data-testid="new_header_logout"
              >
                <span className="text">{HEADER_LOG_OUT_BUTTON}</span>
              </a>
            )}

            {shouldShowExitButton && (
              <a
                href="#"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  navigate(getHomeLink(false))
                }}
                className="new-header__nav-item"
                data-testid="new_header_exit"
              >
                <span className="text">Exit</span>
              </a>
            )}
          </nav>
        </div>
      </header>

      <EpsLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  )
}
