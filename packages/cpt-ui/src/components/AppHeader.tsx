import React from "react"
import {HeaderWithLogo} from "nhsuk-react-components-extensions"
import {
  HEADER_FEEDBACK_BUTTON,
  HEADER_FEEDBACK_TARGET,
  HEADER_CHANGE_ROLE_BUTTON,
  HEADER_CHANGE_ROLE_TARGET,
  HEADER_SELECT_YOUR_ROLE_BUTTON,
  HEADER_SELECT_YOUR_ROLE_TARGET,
  HEADER_LOG_OUT_BUTTON
} from "@/constants/ui-strings/HeaderStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

export default function AppHeader() {
  return (
    <HeaderWithLogo>
      <HeaderWithLogo.Logo href="/" />
      <HeaderWithLogo.ServiceName href="/">
        Prescription Tracker (Pilot)
      </HeaderWithLogo.ServiceName>

      <HeaderWithLogo.Nav id="header-navigation">
        {/* full screen items */}
        <HeaderWithLogo.NavItem
          tabIndex={0}
          role="button"
          onClick={() => window.location.href = HEADER_SELECT_YOUR_ROLE_TARGET}
          data-testid="eps_header_selectYourRoleLink"
        >
          <span className="text">{HEADER_SELECT_YOUR_ROLE_BUTTON}</span>
        </HeaderWithLogo.NavItem>

        <HeaderWithLogo.NavItem
          tabIndex={0}
          role="button"
          onClick={() => window.location.href = HEADER_CHANGE_ROLE_TARGET}
          data-testid="eps_header_changeRoleLink"
        >
          <span className="text">{HEADER_CHANGE_ROLE_BUTTON}</span>
        </HeaderWithLogo.NavItem>

        <HeaderWithLogo.NavItem
          href={HEADER_FEEDBACK_TARGET}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="eps_header_feedbackLink"
        >
          <span className="text">{HEADER_FEEDBACK_BUTTON}</span>
        </HeaderWithLogo.NavItem>

        <HeaderWithLogo.NavItem
          tabIndex={0}
          role="button"
          onClick={() => window.location.href = FRONTEND_PATHS.LOGOUT}
          data-testid="eps_header_logout"
        >
          <span className="text">{HEADER_LOG_OUT_BUTTON}</span>
        </HeaderWithLogo.NavItem>

        <HeaderWithLogo.NavDropdownMenu dropdownText="More">
          <HeaderWithLogo.NavItem
            href={HEADER_FEEDBACK_TARGET}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="eps_header_feedbackLink_mobile"
          >
            <span className="text">{HEADER_FEEDBACK_BUTTON}</span>
          </HeaderWithLogo.NavItem>
          <HeaderWithLogo.NavItem
            tabIndex={0}
            role="button"
            onClick={() => window.location.href = FRONTEND_PATHS.LOGOUT}
            data-testid="eps_header_logout_mobile"
          >
            <span className="text">{HEADER_LOG_OUT_BUTTON}</span>
          </HeaderWithLogo.NavItem>
        </HeaderWithLogo.NavDropdownMenu>
      </HeaderWithLogo.Nav>
    </HeaderWithLogo>
  )
}
