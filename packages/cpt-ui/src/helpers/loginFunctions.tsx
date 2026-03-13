import {FRONTEND_PATHS} from "@/constants/environment"
import {AuthContextType} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"
import {signOut} from "@/helpers/logout"

export const getHomeLink = (isSignedIn: boolean) => {
  return isSignedIn ? FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID : FRONTEND_PATHS.LOGIN
}

export const handleSignIn = async (
  auth: AuthContextType,
  type: "Primary" | "Mock",
  navigate: (path: string) => void) => {
  logger.info(`Redirecting user to ${type} login`)

  try {
    await auth?.cognitoSignIn({
      provider: {
        custom: type
      }
    })
  } catch (err) {
    signOut(auth, navigate, FRONTEND_PATHS.LOGOUT, true)
    logger.error(`Error during ${type} sign in:`, err)
  }
  logger.info("Signed in: ", auth)
}
