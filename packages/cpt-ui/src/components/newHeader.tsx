import React, {useContext} from "react"
import {Link, useNavigate} from "react-router-dom"
import {AuthContext} from "@/context/AuthProvider"
import {getHomeLink} from "@/helpers/loginFunctions"
import {HEADER_SERVICE} from "@/constants/ui-strings/HeaderStrings"
import NhsLogo from "@/components/icons/NhsLogo"
import "@/styles/NewHeader.scss"

export default function NewHeader() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()

  const redirectToLogin = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    navigate(getHomeLink(auth?.isSignedIn || false))
  }

  return (
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
      </div>
    </header>
  )
}
