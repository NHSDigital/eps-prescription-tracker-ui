import React, {useEffect, useRef} from "react"
import {Container} from "nhsuk-react-components"
import {Link} from "react-router-dom"

import {useAuth} from "@/context/AuthProvider"
import EpsSpinner from "@/components/EpsSpinner"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"
import {logger} from "@/helpers/logger"

export default function LogoutPage() {
  const auth = useAuth()

  // use ref to prevent double execution
  const hasSignedOut = useRef(false)

  // Log out on page load
  useEffect(() => {

    const signOut = async () => {
      if (hasSignedOut.current) return // Prevent double execution
      logger.info("Signing out from logout page", auth)
      hasSignedOut.current = true

      await auth?.cognitoSignOut()

      logger.info("Signed out")
    }

    if (auth?.isSignedIn && !hasSignedOut.current) {
      signOut()
    } else {
      logger.info("Cannot sign out - not signed in")
      if (!hasSignedOut.current) {
        auth.clearAuthState() // Clear data even if not signed in
      }
    }

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
