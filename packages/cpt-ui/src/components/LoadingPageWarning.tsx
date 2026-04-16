import {AuthContextType} from "@/context/AuthProvider"
import {WarningCallout} from "nhsuk-react-components"

export const LoadingPageWarning = (auth: AuthContextType) => {
  const emailSubject = "Prescription Tracker redirection issue"
  const emailBody = `Hi EPS team,

I keep being shown the 'You're being redirected' page in the Prescription Tracker with these details:

session ID ${auth.sessionId}
device ID ${auth.deviceId}

Please could you investigate this issue?`

  return (
    <WarningCallout>
      <WarningCallout.Label>
                Important
      </WarningCallout.Label>
      <p>
        {/* Using JSX spacing to overcome spacing not being respected when rendered. */}
        If you keep seeing this page, email{" "}
        <a href={
          `mailto:england.prescriptiontrackerpilot@nhs.net?subject=
          ${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
        } data-testid="email"
        aria-label="EPS Prescription Tracker support email">england.prescriptiontrackerpilot@nhs.net</a>
        {" "}and include this information:</p>
      <ul>
        {auth.sessionId && <li>session ID {auth.sessionId}</li>}
        <li>device ID {auth.deviceId}</li>
      </ul>
    </WarningCallout>
  )
}
