import React, {Fragment, useEffect} from "react"
import {Container, Col, Row} from "nhsuk-react-components"

import {useAuth} from "@/context/AuthProvider"

import EpsSpinner from "@/components/EpsSpinner"
import {EpsLoginPageStrings} from "@/constants/ui-strings/EpsLoginPageStrings"

import {AUTO_LOGIN_ENVIRONMENTS, ENV_CONFIG, type Environment} from "@/constants/environment"
import {Button} from "@/components/ReactRouterButton"
import {logger} from "@/helpers/logger"
import {AUTH_CONFIG} from "@/constants/environment"
import {signOut} from "@/helpers/logout"

export default function LoginPage() {
  const auth = useAuth()

  const target_environment: string =
    ENV_CONFIG.TARGET_ENVIRONMENT as Environment
  const isAutoLoginEnvironment = AUTO_LOGIN_ENVIRONMENTS.map(x => x.environment).includes(target_environment)

  const signIn = async (type: "Primary" | "Mock") => {
    logger.info(`Redirecting user to ${type} login`)
    // await auth.cognitoSignOut() // Clear any existing sessions to ensure a clean login flow
    try {
      await auth?.cognitoSignIn({
        provider: {
          custom: type
        }
      })
    } catch (err) {
      logout()
      logger.error(`Error during ${type} sign in:`, err)
      throw new Error("Error during sign in", {cause: err})
    }
    logger.info("Signed in: ", auth)
  }

  const logout = async () => {
    logger.info("Signing out", auth)
    await signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
    logger.info("Signed out: ", auth)
  }

  useEffect(() => {
    logger.info(
      "Login page loaded. What environment are we in?",
      target_environment
    )

    if (isAutoLoginEnvironment) {
      logger.info("performing auto login")
      const autoLoginDetails = AUTO_LOGIN_ENVIRONMENTS.find(x => x.environment === target_environment)
      signIn(autoLoginDetails?.loginMethod === "cis2" ? "Primary" : "Mock")
      // if (autoLoginDetails?.loginMethod === "cis2") {
      //   logger.info("Redirecting user to cis2 login")
      //   cis2SignIn()
      // } else {
      //   logger.info("Redirecting user to mock login")
      //   mockSignIn()
      // }
    }
  }, [])

  if (isAutoLoginEnvironment) {
    return (
      <main className="nhsuk-main-wrapper">
        <Container>
          <Row>
            <Col width="full">
              <h1>{EpsLoginPageStrings.redirecting_msg}</h1>
              <EpsSpinner />
            </Col>
          </Row>
        </Container>
      </main>
    )
  }

  // This is a dev page, so no need to bother with language support

  return (
    <main className="nhsuk-main-wrapper">
      <Container>

        <Row>
          <Col width="full">
            <h1>Authorisation demonstration</h1>
            <p>
              Since this is not actually set to be integrated into anything yet,
              I&apos;ve made this little page to show how login/logout works.
            </p>
            <p>
              Note that this is the COGNITO login, and displays the relevant information.
            </p>
            <p>
              The auth context carries around the logic and authorisation state, but takes no actions (yet)
              without explicit calls. It could be updated to monitor login status,
              and poll to check for serverside token retractions.
            </p>
          </Col>
        </Row>

        <Row>
          <Col width="full">
            <Button id="primary-signin" style={{margin: "8px"}}
              onClick={() => signIn("Primary")}>Log in with PTL CIS2</Button>
            <Button id="mock-signin" style={{margin: "8px"}}
              onClick={() => signIn("Mock")}>Log in with mock CIS2</Button>
            <Button id="signout" style={{margin: "8px"}} onClick={logout}>Sign Out</Button>

            {auth && (
              <Fragment>
                <div>username: {auth.user}</div>
                <div>isSignedIn: {auth.isSignedIn} </div>
                <h2>Auth Context</h2>
                <pre>{JSON.stringify(auth, null, 2)}</pre>
              </Fragment>
            )}
          </Col>
        </Row>
      </Container>
    </main>
  )
}
