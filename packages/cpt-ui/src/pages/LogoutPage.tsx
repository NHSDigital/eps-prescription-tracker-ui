import React, {useEffect} from "react"
import {Container} from "nhsuk-react-components"
import {Link} from "react-router-dom"

import {useAuth} from "@/context/AuthProvider"
import EpsSpinner from "@/components/EpsSpinner"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"
import {signOut} from "@/helpers/logout"

export default function LogoutPage() {
  const auth = useAuth()

  // Log out on page load
  useEffect(() => {
    signOut(auth)
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
