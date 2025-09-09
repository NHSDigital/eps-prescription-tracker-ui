import React from "react"
import {AuthContextType} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"

/*
** Universal sign out helper functions
** Used on the LogoutPage & SessionLoggedOutPage for a consistent sign out process
*/

export const executeSignOut = async (auth: AuthContextType,
    hasSignedOut: React.MutableRefObject<boolean>, redirectUrl?: string) => {
      if (hasSignedOut.current) return // Prevent double execution
      logger.info("Signing out from logout page", auth)
      hasSignedOut.current = true

      await auth?.cognitoSignOut(redirectUrl)

      logger.info("Signed out")
    }

export const signOut = async (auth: AuthContextType,
    hasSignedOut: React.MutableRefObject<boolean>, redirectUrl: string | undefined = undefined) => {
    if (auth?.isSignedIn && !hasSignedOut.current) {
      executeSignOut(auth, hasSignedOut, redirectUrl)
    } else {
      logger.info("Cannot sign out - not signed in")
      if (!hasSignedOut.current) {
        auth.clearAuthState() // Clear data even if not signed in
      }
    }
}
