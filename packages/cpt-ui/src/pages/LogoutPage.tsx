import React, {Fragment, useEffect} from "react"
import {Container} from "nhsuk-react-components"
import {Link, useNavigate} from "react-router-dom"
import {useAuth} from "@/context/AuthProvider"
import EpsSpinner from "@/components/EpsSpinner"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"
import {handleSignoutEvent} from "@/helpers/logout"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function LogoutPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  usePageTitle(EpsLogoutStrings.PAGE_TITLE)

  useEffect(() => {
    if (auth.isSignedIn || auth.isSigningIn) {
      handleSignoutEvent(auth, navigate, "LogoutPage")
    } else if (auth.isSigningOut) {
      auth.setIsSigningOut(false)
    }
  }, [auth.isSignedIn, auth.isSigningIn, auth.isSigningOut, auth.logoutMarker])

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        {(!auth?.isSignedIn && !auth.isSigningIn && !auth.isSigningOut) ? (
          <Fragment>
            <h1>{EpsLogoutStrings.TITLE}</h1>
            <p>{EpsLogoutStrings.BODY}</p>
            <Link to="/login">{EpsLogoutStrings.LOGIN_LINK}</Link>
          </Fragment>
        ) : (
          <Fragment>
            <h1>{EpsLogoutStrings.LOADING}</h1>
            <EpsSpinner />
          </Fragment>
        )}
      </Container>
    </main>
  )
}
