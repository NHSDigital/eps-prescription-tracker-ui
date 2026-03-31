import {FRONTEND_PATHS, AUTH_CONFIG} from "@/constants/environment"
import {AuthContextType} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"
import {signOut, checkForRecentLogoutMarker} from "@/helpers/logout"
import {AuthError} from "@aws-amplify/auth"

export const getHomeLink = (isSignedIn: boolean) => {
  return isSignedIn ? FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID : FRONTEND_PATHS.LOGIN
}

export const handleSignIn = async (
  auth: AuthContextType,
  type: "Primary" | "Mock",
  navigate: (path: string) => void) => {
  if (checkForRecentLogoutMarker("SignIn")) {
    logger.info("Attempting to sign-out, prohibit sign as well")
  }

  auth.setStateForSignIn()
  logger.info(`Redirecting user to ${type} login`)

  try {
    await auth?.cognitoSignIn({
      provider: {
        custom: type
      }
    })
  } catch (err) {
    if ((err as AuthError).name === "UserAlreadyAuthenticatedException") {
      logger.info("User already authenticated, operating signout")
      signOut(auth, navigate, AUTH_CONFIG.REDIRECT_SIGN_OUT, true)
    }
    logger.error(`Error during ${type} sign in:`, err)
  }
  logger.info("Signed in: ", auth)
}
