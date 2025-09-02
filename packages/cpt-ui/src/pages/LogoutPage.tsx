import React, {useEffect} from "react"
import {Container} from "nhsuk-react-components"
import {Link} from "react-router-dom"

import {useAuth} from "@/context/AuthProvider"
import EpsSpinner from "@/components/EpsSpinner"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"
import {logger} from "@/helpers/logger"

export default function LogoutPage() {
  const auth = useAuth()

  // Log out on page load
  useEffect(() => {
    const signOut = async () => {
      logger.info("Signing out from logout page", auth)

      auth?.clearAuthState()

      logger.info("Signed out")
    }

    signOut() // always run signOut, even if not signed in
  }, [])

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        {!auth?.isSignedIn ? (
          <>
            <h1>{EpsLogoutStrings.title}</h1>
            <p>{EpsLogoutStrings.body}</p>
            <Link to="/login">{EpsLogoutStrings.login_link}</Link>
          </>
        ) : (
          <>
            <h1>{EpsLogoutStrings.loading}</h1>
            <EpsSpinner />
          </>
        )}
      </Container>
    </main>
  )
}
