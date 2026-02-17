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

  usePageTitle(EpsLogoutStrings.PAGE_TITLE)

  useEffect(() => {
    if (auth.authStatus === "signed_in" || auth.authStatus === "signing_in") {
      signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
    }
    // signing_out and signed_out are handled by the Hub listener in AuthProvider
  }, [auth.authStatus])

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        {auth.authStatus === "signed_out" || auth.authStatus === "signing_out" ? (
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
