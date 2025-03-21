import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Header } from "nhsuk-react-components";
import {
  HEADER_SERVICE,
  HEADER_EXIT_BUTTON,
  HEADER_EXIT_TARGET,
  HEADER_CHANGE_ROLE_BUTTON,
  HEADER_CHANGE_ROLE_TARGET,
  HEADER_SELECT_YOUR_ROLE_TARGET,
  HEADER_SELECT_YOUR_ROLE_BUTTON
} from "@/constants/ui-strings/HeaderStrings"

import { AuthContext } from "@/context/AuthProvider"
import { useAccess } from '@/context/AccessProvider'

import { EpsLogoutModal } from "@/components/EpsLogoutModal"
import { normalizePath } from "@/helpers/utils";

export default function EpsHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useContext(AuthContext)
  const accessContext = useAccess()

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
      path !== "/select-role" &&
      path !== "/change-role" &&
      path !== "/logout" &&
      isSignedIn &&
      !accessContext.singleAccess &&
      !accessContext.selectedRole
    )

    // Show "Change role" link (if not single access)
    setShouldShowChangeRole(
      path !== "/select-role" &&
      path !== "/change-role" &&
      path !== "/logout" &&
      isSignedIn &&
      !accessContext.singleAccess &&
      accessContext.selectedRole !== undefined
    )

    // Show the "Logout" link only if the user is signed in
    setShouldShowLogoutLink(Boolean(auth?.isSignedIn))

    // Show the "Exit" button under these conditions
    setShouldShowExitButton(
      (path === "/logout" && !auth?.isSignedIn) ||
      (path === "/select-role" && accessContext.noAccess) ||
      (path === "/notfound")
    )
  }, [location, auth, accessContext])

  const redirectToLogin = async (e: React.MouseEvent | React.KeyboardEvent) => {
    // Naked href don't respect the router, so this overrides that
    e.preventDefault()
    navigate("/login")
  }

  const handleLogoutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setShowLogoutModal(true)
  }

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false)
    navigate("/logout")
  }

  return (
    <>
      <Header transactional className="masthead" id="eps-header">
        <Header.Container className="masthead-container">
          <Header.Logo href="/" data-testid="eps_header_logoLink" />

          <Header.ServiceName
            href="/login"
            onClick={redirectToLogin}
            data-testid="eps_header_serviceName"
          >
            {HEADER_SERVICE}
          </Header.ServiceName>
          <Header.Content />
        </Header.Container>

        <Header.Nav className="masthead-nav">
          {/* Select your role */}
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

          {/* Change role */}
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

          {/* Log out */}
          {shouldShowLogoutLink && (
            <li className="nhsuk-header__navigation-item">
              <Link
                className="nhsuk-header__navigation-link"
                to="/logout"
                data-testid="eps_header_logout"
                onClick={handleLogoutClick}
              >
                Log out
              </Link>
            </li>
          )}

          {/* Exit button */}
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
