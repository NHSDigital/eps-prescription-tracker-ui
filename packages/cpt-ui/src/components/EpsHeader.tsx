import React, {useContext, useEffect, useState} from "react"
import {Link, useNavigate, useLocation} from "react-router-dom"
import {AuthContext} from "@/context/AuthProvider"
import {useAuth} from "@/context/AuthProvider"
import {getHomeLink} from "@/helpers/loginFunctions"
import {HEADER_STRINGS} from "@/constants/ui-strings/HeaderStrings"
import {EpsLogoutModal} from "@/components/EpsLogoutModal"
import {normalizePath} from "@/helpers/utils"
import {FRONTEND_PATHS, AUTH_CONFIG} from "@/constants/environment"
import {signOut} from "@/helpers/logout"
import NhsLogo from "@/components/icons/NhsLogo"

export default function EpsHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useContext(AuthContext)
  const authContext = useAuth()

  const [shouldShowSelectRole, setShouldShowSelectRole] = useState(false)
  const [shouldShowChangeRole, setShouldShowChangeRole] = useState(false)
  const [shouldShowLogoutLink, setShouldShowLogoutLink] = useState(false)
  const [shouldShowExitButton, setShouldShowExitButton] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

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
      !authContext.hasSingleRoleAccess() &&
      !authContext.selectedRole
    )

    setShouldShowChangeRole(
      path !== FRONTEND_PATHS.SESSION_SELECTION &&
      path !== FRONTEND_PATHS.SELECT_YOUR_ROLE &&
      path !== FRONTEND_PATHS.CHANGE_YOUR_ROLE &&
      path !== FRONTEND_PATHS.LOGOUT &&
      isSignedIn &&
      !authContext.hasSingleRoleAccess() &&
      authContext.selectedRole !== undefined
    )

    setShouldShowLogoutLink(Boolean(auth?.isSignedIn))

    setShouldShowExitButton(
      (path === FRONTEND_PATHS.LOGOUT && !auth?.isSignedIn) ||
      (path === FRONTEND_PATHS.SELECT_YOUR_ROLE && authContext.rolesWithAccess.length === 0) ||
      (path === "/notfound")
    )
  }, [location, auth, authContext])

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.matchMedia("(max-width: 768px)").matches
      setIsMobileView(mobile)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const redirectToLogin = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    navigate(getHomeLink(auth?.isSignedIn || false))
  }

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowLogoutModal(true)
  }

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false)
    signOut(authContext, AUTH_CONFIG.REDIRECT_SIGN_OUT)
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  return (
    <>
      <header className="eps-header">
        <div className="eps-header__content">
          <Link
            to={getHomeLink(auth?.isSignedIn || false)}
            onClick={redirectToLogin}
            className="eps-header__logo-link"
            aria-label="Prescription Tracker ()"
            aria-labelledby="eps-prescription-tracker-header-link"
            data-testid="eps_header_logoLink"
            id="eps-prescription-tracker-header-link"
          >
            <NhsLogo
              className="eps-header__logo"
              width="40"
              height="16"
              ariaLabelledBy="eps-prescription-tracker-header-link"
              titleId="eps-nhs-logo_title"
              variant="white"
            />
            <span className="eps-header__service-name" data-testid="eps_header_serviceName">
              {HEADER_STRINGS.SERVICE}
            </span>
          </Link>

          <nav className="eps-header__nav" id="eps-header-navigation">
            {!isMobileView && (
              <div className="eps-header__nav-desktop">
                {shouldShowSelectRole && (
                  <a
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault()
                      navigate(HEADER_STRINGS.SELECT_YOUR_ROLE_TARGET)
                    }}
                    className="eps-header__nav-item"
                    data-testid="eps_header_selectYourRoleLink"
                  >
                    <span className="text">{HEADER_STRINGS.SELECT_YOUR_ROLE_BUTTON}</span>
                  </a>
                )}

                {shouldShowChangeRole && (
                  <a
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault()
                      navigate(HEADER_STRINGS.CHANGE_ROLE_TARGET)
                    }}
                    className="eps-header__nav-item"
                    data-testid="eps_header_changeRoleLink"
                  >
                    <span className="text">{HEADER_STRINGS.CHANGE_ROLE_BUTTON}</span>
                  </a>
                )}

                <a
                  href={HEADER_STRINGS.FEEDBACK_TARGET}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eps-header__nav-item"
                  data-testid="eps_header_feedbackLink"
                >
                  <span className="text">{HEADER_STRINGS.FEEDBACK_BUTTON}</span>
                </a>

                {shouldShowLogoutLink && (
                  <a
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      handleLogoutClick(e)
                      setIsDropdownOpen(false)
                    }}
                    className="eps-header__nav-item"
                    data-testid="eps_header_logout"
                  >
                    <span className="text">{HEADER_STRINGS.LOG_OUT_BUTTON}</span>
                  </a>
                )}

                {shouldShowExitButton && (
                  <a
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault()
                      navigate(getHomeLink(false))
                      setIsDropdownOpen(false)
                    }}
                    className="eps-header__nav-item"
                    data-testid="eps_header_exit"
                  >
                    <span className="text">Exit</span>
                  </a>
                )}
              </div>
            )}

            {isMobileView && (
              <div className="eps-header__nav-mobile">
                <button
                  className={`eps-header__menu-toggle ${
                    isDropdownOpen ? "eps-header__menu-toggle--expanded" : " "
                  }`}
                  onClick={toggleDropdown}
                  aria-label="Toggle navigation menu"
                  data-testid="eps_header_menuToggle"
                >
                  <span className="text">More</span>
                  <svg
                    className="eps-header__menu-icon"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline
                      points="9,11 12,14 15,11"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </button>

                <div className={`eps-header__dropdown ${
                  isDropdownOpen ? " " : "eps-header__dropdown--hidden"
                }`}>
                  {shouldShowSelectRole && (
                    <a
                      href="#"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault()
                        navigate(HEADER_STRINGS.SELECT_YOUR_ROLE_TARGET)
                        setIsDropdownOpen(false)
                      }}
                      className="eps-header__dropdown-item"
                      data-testid="eps_header_selectYourRoleLink_mobile"
                    >
                      <span className="text">{HEADER_STRINGS.SELECT_YOUR_ROLE_BUTTON}</span>
                    </a>
                  )}

                  {shouldShowChangeRole && (
                    <a
                      href="#"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault()
                        navigate(HEADER_STRINGS.CHANGE_ROLE_TARGET)
                        setIsDropdownOpen(false)
                      }}
                      className="eps-header__dropdown-item"
                      data-testid="eps_header_changeRoleLink_mobile"
                    >
                      <span className="text">{HEADER_STRINGS.CHANGE_ROLE_BUTTON}</span>
                    </a>
                  )}

                  <a
                    href={HEADER_STRINGS.FEEDBACK_TARGET}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eps-header__dropdown-item"
                    data-testid="eps_header_feedbackLink_mobile"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span className="text">{HEADER_STRINGS.FEEDBACK_BUTTON}</span>
                  </a>

                  {shouldShowLogoutLink && (
                    <a
                      href="#"
                      onClick={(e: React.MouseEvent) => {
                        handleLogoutClick(e)
                        setIsDropdownOpen(false)
                      }}
                      className="eps-header__dropdown-item"
                      data-testid="eps_header_logout_mobile"
                    >
                      <span className="text">{HEADER_STRINGS.LOG_OUT_BUTTON}</span>
                    </a>
                  )}

                  {shouldShowExitButton && (
                    <a
                      href="#"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault()
                        navigate(getHomeLink(false))
                        setIsDropdownOpen(false)
                      }}
                      className="eps-header__dropdown-item"
                      data-testid="eps_header_exit_mobile"
                    >
                      <span className="text">Exit</span>
                    </a>
                  )}
                </div>
              </div>
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
