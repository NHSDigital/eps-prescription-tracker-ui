import React, {Fragment, useEffect} from "react"
import {Container} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {useAuth} from "@/context/AuthProvider"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function LogoutPage() {
  const auth = useAuth()

  usePageTitle(EpsLogoutStrings.PAGE_TITLE)

  useEffect(() => {
    if (auth.isSigningOut) {
      auth.setIsSigningOut(false)
    }
  }, [auth.isSigningOut])

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <Fragment>
          <h1>{EpsLogoutStrings.TITLE}</h1>
          <p>{EpsLogoutStrings.BODY}</p>
          <Link to="/login">{EpsLogoutStrings.LOGIN_LINK}</Link>
        </Fragment>
      </Container>
    </main>
  )
}
