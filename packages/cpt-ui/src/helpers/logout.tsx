import {AuthContextType} from "@/context/AuthProvider"
import {logger} from "./logger"
import {AUTH_CONFIG, FRONTEND_PATHS} from "@/constants/environment"

/*
** Universal sign out helper functions
** Used on the LogoutPage & SessionLoggedOutPage for a consistent sign out process
*/

export const signOut = async (
  authParam: AuthContextType,
  redirectUri?: string,
  navigate?: (path: string) => void
) => {
  authParam.setStateForSignOut()

  const location = window.location.pathname
  const defaultUri = AUTH_CONFIG.REDIRECT_SIGN_OUT

  const targetUri = redirectUri ? redirectUri : defaultUri
  logger.info(`Called signOut helper from ${location} with redirect of ${targetUri}`,
    authParam)
  try {
    logger.info("Signing out with specified redirect path", targetUri)
    await authParam?.cognitoSignOut(targetUri)
  } catch (err) {
    logger.error(`Error during sign out with specified redirect path: ${targetUri}`, err)
    navigate?.(FRONTEND_PATHS.LOGOUT)
  }
  // Status hub will clear auth state
}

export const handleRestartLogin = async (
  auth: AuthContextType,
  invalidSessionCause: string | undefined,
  navigate?: (path: string) => void
) => {
  logger.info("Handling restart login instruction from backend", invalidSessionCause)
  logger.info("AUTH_CONFIG values:", {
    REDIRECT_SIGN_OUT: AUTH_CONFIG.REDIRECT_SIGN_OUT,
    REDIRECT_SESSION_SIGN_OUT: AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT
  })

  if (invalidSessionCause) {
    logger.info(`Invalid session cause supplied, ${invalidSessionCause}`)
    // await auth.updateInvalidSessionCause(invalidSessionCause)
    logger.info("About to sign out with REDIRECT_SESSION_SIGN_OUT:", AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT)
    await signOut(auth, AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT, navigate)
  } else {
    logger.info("No invalid session cause, using REDIRECT_SIGN_OUT:", AUTH_CONFIG.REDIRECT_SIGN_OUT)
    await signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT, navigate)
  }
}
