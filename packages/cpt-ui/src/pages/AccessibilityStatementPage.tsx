import React from "react"
import {Link} from "react-router-dom"
import {getHomeLink} from "@/helpers/loginFunctions"
import {Breadcrumb} from "nhsuk-react-components"
import {useAuth} from "@/context/AuthProvider"
import {usePageTitle} from "@/hooks/usePageTitle"
import {AccessibilityStatementStrings} from "@/constants/ui-strings/AccessibilityStatement"

export default function AccessibilityStatementPage() {
  const auth = useAuth()

  usePageTitle(AccessibilityStatementStrings.pageTitle)

  return (
    <main className="nhsuk-width-container nhsuk-u-margin-top-4">
      <div id="main-content"/>
      <Breadcrumb>
        <Breadcrumb.Item>
          <Link to={getHomeLink(auth.isSignedIn)}>
            {AccessibilityStatementStrings.home}
          </Link>
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="nhsuk-grid-row">
        <div className="nhsuk-grid-column-full" data-testid="privacy-notice-content">
          <h1 className="nhsuk-heading-xl">{AccessibilityStatementStrings.header}</h1>

          <h2 className="nhsuk-heading-l">{AccessibilityStatementStrings.intro.header}</h2>
          <p>{AccessibilityStatementStrings.intro.welcome}</p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.contact.header}
          </h2>
        </div>
      </div>
    </main>
  )
}
