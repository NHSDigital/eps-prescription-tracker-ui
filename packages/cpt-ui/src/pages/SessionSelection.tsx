import {Container, Col, Row} from "nhsuk-react-components"
import {Button} from "@/components/ReactRouterButton"
import {useNavigate} from "react-router-dom"
import {AUTH_CONFIG, FRONTEND_PATHS} from "@/constants/environment"
import {postSessionManagementUpdate} from "@/helpers/sessionManagement"
import {useAuth} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"
import {signOut} from "@/helpers/logout"
import {useState} from "react"
import {cptAwsRum} from "@/helpers/awsRum"

export default function SessionSelectionPage() {
  const [startNewSessionClicked, setStartNewSessionClicked] = useState<boolean>(false)
  const navigate = useNavigate()
  const auth = useAuth()
  cptAwsRum.recordPageView()

  const logout = async () => {
    signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
  }

  const redirectUser = (destination: string) => {
    navigate(destination)
  }

  const setSession = async () => {
    if (startNewSessionClicked) {
      return
    }

    setStartNewSessionClicked(true)
    const status = await postSessionManagementUpdate(auth)
    if (status === true) {
      logger.info("Redirecting user to search by prescription ID")
      redirectUser(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    } else {
      logger.info("Redirecting user to login")
      signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
    }
  }

  // TODO: In the future, if error state from session management API,
  // draw banner item or full page content to describe to user.
  return (
    <main id="main-content" className="nhsuk-main-wrapper" data-testid="session-selection-page">
      <Container>
        <Row>
          <Col width="full">
            <h1 data-testid="title">You are already logged in to the Prescription Tracker</h1>
            <p data-testid="description">
              There is a session using these login details in another browser, window or device.</p>
            <p data-testid="instructions">
              You can continue to start a new session in this window, but this will end the other session.</p>
          </Col>
        </Row>

        <Row>
          <Col width="full">
            <Button id="create-a-new-session" style={{margin: "8px"}} className="nhsuk-button"
              onClick={setSession} disabled={startNewSessionClicked} data-testid="new-session-button">
                Start a new session</Button>
            <Button id="close-this-window" style={{margin: "8px"}} className="nhsuk-button nhsuk-button--secondary"
              onClick={logout} data-testid="close-window-button">Close this window</Button>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
