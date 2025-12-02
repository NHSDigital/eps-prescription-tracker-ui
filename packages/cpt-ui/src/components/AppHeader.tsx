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

  // Navigation setup function that can be called on load and resize
  const setupNavigation = () => {
    // eslint-disable-next-line no-console
    console.log("🔧 AppHeader: Setting up navigation for current viewport...")

    const currentWidth = window.innerWidth
    const isMobile = currentWidth <= 768 // Standard mobile/tablet breakpoint
    const dropdown = document.querySelector(".nhsuk-header__drop-down") as HTMLElement
    const navigationList = document.querySelector(".nhsuk-header__navigation-list") as HTMLElement

    // eslint-disable-next-line no-console
    console.log(`📏 Current width: ${currentWidth}px, isMobile: ${isMobile} (breakpoint: 768px)`)

    if (!dropdown || !navigationList) {
      // eslint-disable-next-line no-console
      console.log("❌ Missing dropdown or navigation elements")
      return
    }

    if (isMobile) {
      // MOBILE: Always show dropdown regardless of measured overflow
      // because the NHS component's own JS interferes with accurate measurement
      const navItems = navigationList.querySelectorAll(
        ".nhsuk-header__navigation-item:not(.nhsuk-mobile-menu-container)"
      )
      const moreButton = document.querySelector(".nhsuk-header__menu-toggle") as HTMLElement

      // eslint-disable-next-line no-console
      console.log(`📱 Mobile: Found ${navItems.length} nav items - always moving to dropdown`)

      if (navItems.length > 0) {
        // Always move items to dropdown on mobile
        // eslint-disable-next-line no-console
        console.log("📦 Moving all navigation items to dropdown (mobile mode)")

        dropdown.innerHTML = ""
        navItems.forEach((item) => {
          const clonedItem = item.cloneNode(true) as HTMLElement
          dropdown.appendChild(clonedItem)
          ;(item as HTMLElement).style.display = "none"
        })
        dropdown.classList.add("nhsuk-header__drop-down--hidden")

        // Always show the More button on mobile
        if (moreButton) {
          moreButton.style.setProperty("display", "flex", "important")
          // eslint-disable-next-line no-console
          console.log("📱 More button shown (mobile mode)")
        } else {
          // eslint-disable-next-line no-console
          console.log("❌ More button not found")
        }
      }
    } else {
      // DESKTOP: Always restore items and hide dropdown/More button
      const dropdownItems = dropdown.querySelectorAll(".nhsuk-header__navigation-item")
      const hiddenNavItems = navigationList.querySelectorAll(
        ".nhsuk-header__navigation-item:not(.nhsuk-mobile-menu-container)"
      )

      // eslint-disable-next-line no-console
      console.log(`🖥️ Desktop mode: ${dropdownItems.length} in dropdown, ${hiddenNavItems.length} hidden nav items`)

      if (dropdownItems.length > 0) {
        // eslint-disable-next-line no-console
        console.log("🔄 Restoring navigation items to main navigation...")

        // Show hidden nav items
        hiddenNavItems.forEach((item) => {
          ;(item as HTMLElement).style.display = ""
        })

        // Clear dropdown
        dropdown.innerHTML = ""
        dropdown.classList.add("nhsuk-header__drop-down--hidden")
      }

      // Always hide More button on desktop
      const moreButton = document.querySelector(".nhsuk-header__menu-toggle") as HTMLElement
      if (moreButton) {
        moreButton.style.setProperty("display", "none", "important")
        // eslint-disable-next-line no-console
        console.log("🔒 Desktop: More button hidden with !important")
      }
    }
  }

  // Force navigation recalculation after component mounts to fix mobile layout
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🚀 AppHeader: Setting up navigation timer")

    const timer = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log("⏰ Timer: Running navigation setup")
      setupNavigation()
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [shouldShowSelectRole, shouldShowChangeRole, shouldShowLogoutLink, shouldShowExitButton])

  // Monitor viewport changes and handle navigation structure for both mobile and desktop
  useEffect(() => {
    let resizeTimer: number

    const handleResize = () => {
      // Debounce resize events with slightly longer delay for layout settling
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log("🔄 Window resized - running navigation setup")

        // Give the browser a moment to recalculate layout after resize
        requestAnimationFrame(() => {
          setupNavigation()
        })
      }, 200) // Increased delay for better layout settling
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(resizeTimer)
    }
  }, [])

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

          <HeaderWithLogo.ServiceName>
            {HEADER_SERVICE}
          </HeaderWithLogo.ServiceName>
        </Link>
        <HeaderWithLogo.Nav id="header-navigation" className="nhsuk-header__navigation">
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
