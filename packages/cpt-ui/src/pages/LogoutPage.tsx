import React, {Fragment, useEffect} from "react"
import {Container} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {useAuth} from "@/context/AuthProvider"
import EpsSpinner from "@/components/EpsSpinner"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"
import {signOut} from "@/helpers/logout"
import {AUTH_CONFIG} from "@/constants/environment"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function LogoutPage() {
  const auth = useAuth()

  usePageTitle(EpsLogoutStrings.pageTitle)

  useEffect(() => {
    if (auth.isSignedIn || auth.isSigningIn) {
      signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
    } else if (auth.isSigningOut) {
      auth.setIsSigningOut(false)
    }
  }, [auth.isSignedIn, auth.isSigningIn])

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        {!auth?.isSignedIn && !auth.isSigningIn ? (
          <Fragment>
            <h1>{EpsLogoutStrings.title}</h1>
            <p>{EpsLogoutStrings.body}</p>
            <Link to="/login">{EpsLogoutStrings.loginLink}</Link>
          </Fragment>
        ) : (
          <Fragment>
            <h1>{EpsLogoutStrings.loading}</h1>
            <EpsSpinner />
          </Fragment>
        )}
      </Container>
    </main>
  )
}
