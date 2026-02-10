import {Container, Col, Row} from "nhsuk-react-components"
import {Button} from "@/components/ReactRouterButton"
import {useNavigate} from "react-router-dom"
import {AUTH_CONFIG, FRONTEND_PATHS} from "@/constants/environment"
import {postSessionManagementUpdate} from "@/helpers/sessionManagement"
import {useAuth} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"
import {signOut} from "@/helpers/logout"
import {useState} from "react"
import {usePageTitle} from "@/hooks/usePageTitle"
import {SESSION_SELECTION_PAGE_STRINGS} from "@/constants/ui-strings/SessionSelectionPage"
import {sendMetrics} from "@/components/Telemetry"

export default function SessionSelectionPage() {
  const [startNewSessionClicked, setStartNewSessionClicked] = useState<boolean>(false)
  const navigate = useNavigate()
  const auth = useAuth()

  usePageTitle(SESSION_SELECTION_PAGE_STRINGS.pageTitle)

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
      sendMetrics({
        "metric_name": "concurrent_session_choose_new",
        "dimension": {"type": "SUMTOTAL", "value": 1}
      })
      logger.info("Redirecting user to search by prescription ID")
      redirectUser(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    } else {
      sendMetrics({
        "metric_name": "concurrent_session_choose_existing",
        "dimension": {"type": "SUMTOTAL", "value": 1}
      })
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
            <h1 data-testid="title">{SESSION_SELECTION_PAGE_STRINGS.headerText}</h1>
            <p data-testid="description">
              {SESSION_SELECTION_PAGE_STRINGS.bodyText1}</p>
            <p data-testid="instructions">
              {SESSION_SELECTION_PAGE_STRINGS.bodyText2}</p>
          </Col>
        </Row>

        <Row>
          <Col width="full">
            <Button id="create-a-new-session" style={{margin: "8px"}} className="nhsuk-button"
              onClick={setSession} disabled={startNewSessionClicked} data-testid="new-session-button">
              {SESSION_SELECTION_PAGE_STRINGS.buttonText1}</Button>
            <Button id="close-this-window" style={{margin: "8px"}} className="nhsuk-button nhsuk-button--secondary"
              onClick={logout} data-testid="close-window-button">{SESSION_SELECTION_PAGE_STRINGS.buttonText2}</Button>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
