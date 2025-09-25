import {AuthContextType, useAuth} from "@/context/AuthProvider"
import {logger} from "./logger"
import {AUTH_CONFIG} from "@/constants/environment"
import { AxiosError } from "axios"

/*
** Universal sign out helper functions
** Used on the LogoutPage & SessionLoggedOutPage for a consistent sign out process
*/

export const signOut = async (authParam: AuthContextType, redirectUri?: string) => {
  const location = window.location.pathname
  logger.info(`Called signOut helper from ${location} with redirect of ${redirectUri}`)
  if (redirectUri) {
    logger.info("Signing out with specified redirect path", redirectUri)
    await authParam?.cognitoSignOut(redirectUri)
  } else {
    const defaultUri = AUTH_CONFIG.REDIRECT_SIGN_OUT
    logger.info("Signing out with default redirect path", defaultUri)
    await authParam?.cognitoSignOut(defaultUri)
  }
  // Status hub will clear auth state
}

type RestartLoginData = {
  restartLogin?: boolean
  invalidSessionCause?: string
  [key: string]: unknown
}

export const handleRestartLogin = async (auth: AuthContextType, errorResponse: AxiosError) => {
  logger.info("Handling restart login instruction from backend")
  const data = errorResponse.response?.data as RestartLoginData | undefined

  logger.info(errorResponse)

  if (data?.restartLogin && data?.invalidSessionCause) {
    logger.info(`Invalid session cause supplied, ${data.invalidSessionCause}`)
    await auth.updateInvalidSessionCause(data.invalidSessionCause)
    await signOut(auth, AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT)
    return
  }
  await signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
}
