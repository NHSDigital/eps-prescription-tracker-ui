import {Container, Col, Row} from "nhsuk-react-components"
import {Button} from "@/components/ReactRouterButton"
import {useNavigate} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {postSessionManagementUpdate} from "@/helpers/sessionManagement"
import {useAuth} from "@/context/AuthProvider"

export default function SessionSelectionPage() {
  const navigate = useNavigate()
  const auth = useAuth()

  const signOut = async () => {
    navigate(FRONTEND_PATHS.LOGOUT)
  }

  const setSession = async () => {
    await postSessionManagementUpdate(auth)
  }

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h1>You are already logged in to the Prescription Tracker</h1>
            <p>There is a session using these login details in another browser, window or device.</p>
            <p>You can continue to start a new session in this window, but this will end the other session.</p>
          </Col>
        </Row>

        <Row>
          <Col width="full">
            <Button id="new-session" style={{margin: "8px"}} className="nhsuk-button"
              onClick={setSession}>Start a new session</Button>
            <Button id="close-session" style={{margin: "8px"}} className="nhsuk-button nhsuk-button--secondary"
              onClick={signOut}>Close this window</Button>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
