import {AuthContextType} from "@/context/AuthProvider"
import {WarningCallout} from "nhsuk-react-components"

export const LoadingPageWarning = (auth: AuthContextType) => {
  const emailSubject = "Prescription Tracker redirection issue"
  const emailBody = `Hi EPS team,

I keep being shown the 'You're being redirected' page in the Prescription Tracker with these details:

session ID ${auth.sessionId}
desktop ID ${auth.desktopId}

Please could you investigate this issue?`

  return (
    <WarningCallout>
      <WarningCallout.Label>
                Information
      </WarningCallout.Label>
      <p>
                If you keep seeing this page, email{" "}
        <a href={
          `mailto:epssupport@nhs.net?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
        } data-testid="email" aria-label="EPS Prescription Tracker support email">epssupport@nhs.net</a>
        {" "}and include this information:</p>
      <ul>
        {auth.sessionId && <li>session ID {auth.sessionId}</li>}
        <li>desktop ID {auth.desktopId}</li>
      </ul>
    </WarningCallout>
  )
}
