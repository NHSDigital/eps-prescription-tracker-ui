import {FRONTEND_PATHS} from "@/constants/environment"
import {AuthContextType} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"
import {signOut} from "@/helpers/logout"

export const getHomeLink = (isSignedIn: boolean) => {
  return isSignedIn ? FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID : FRONTEND_PATHS.LOGIN
}

export const handleSignIn = async (auth: AuthContextType, type: "Primary" | "Mock") => {
  logger.info(`Redirecting user to ${type} login`)
  // await auth.cognitoSignOut() // Clear any existing sessions to ensure a clean login flow
  async function attemptLogin() {
    await auth?.cognitoSignIn({
      provider: {
        custom: type
      }
    })
  }

  try {
    await attemptLogin()
  } catch (err) {
    signOut(auth)
    logger.error(`Error during ${type} sign in:`, err)
  }
  logger.info("Signed in: ", auth)
}
