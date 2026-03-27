import React from "react"
import {Link} from "react-router-dom"
import {getHomeLink} from "@/helpers/loginFunctions"
import {Breadcrumb} from "nhsuk-react-components"
import {useAuth} from "@/context/AuthProvider"
import {usePageTitle} from "@/hooks/usePageTitle"
import {AccessibilityStatementStrings} from "@/constants/ui-strings/AccessibilityStatementStrings"
import EpsRichText from "@/components/EpsRichText"

export default function AccessibilityStatementPage() {
  const auth = useAuth()

  usePageTitle(AccessibilityStatementStrings.PAGE_TITLE)

  return (
    <main className="nhsuk-width-container nhsuk-u-margin-top-4">
      <div id="main-content"/>
      <Breadcrumb>
        <Breadcrumb.Item>
          <Link to={getHomeLink(auth.isSignedIn)}>
            {AccessibilityStatementStrings.HOME}
          </Link>
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="nhsuk-grid-row nhsuk-u-margin-bottom-7">
        <div className="nhsuk-grid-column-full" data-testid="accessibility-statement-content">
          <h1 className="nhsuk-heading-xl">{AccessibilityStatementStrings.HEADER}</h1>
          <p><EpsRichText content={AccessibilityStatementStrings.OPENING_SECTION.P1} /></p>
          <p>{AccessibilityStatementStrings.OPENING_SECTION.P2}</p>
          <ul>
            {AccessibilityStatementStrings.OPENING_SECTION.LIST_ITEMS.map((listItem, index) => (
              <li key={index}>{listItem}</li>
            ))}
          </ul>

          <p>{AccessibilityStatementStrings.OPENING_SECTION.P3}</p>
          <p><EpsRichText content={AccessibilityStatementStrings.OPENING_SECTION.P4} /></p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.KNOWN_ISSUES.HEADER}
          </h2>
          <p>
            {AccessibilityStatementStrings.KNOWN_ISSUES.P1}
          </p>
          <ul>
            {AccessibilityStatementStrings.KNOWN_ISSUES.LIST_ITEMS.map((listItem, index) => (
              <li key={index}>{listItem}</li>
            ))}
          </ul>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.FEEDBACK_CONTACT_INFORMATION.HEADER}
          </h2>
          <p>
            <EpsRichText content={AccessibilityStatementStrings.FEEDBACK_CONTACT_INFORMATION.P1} />
          </p>
          <p>
            <EpsRichText content={AccessibilityStatementStrings.FEEDBACK_CONTACT_INFORMATION.P2} />
          </p>
          <p>
            {AccessibilityStatementStrings.FEEDBACK_CONTACT_INFORMATION.P3}
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.ENFORCEMENT_PROCEDURE.HEADER}
          </h2>
          <p>
            <EpsRichText content={AccessibilityStatementStrings.ENFORCEMENT_PROCEDURE.P1} />
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.TECHNICAL_INFORMATION.HEADER}
          </h2>
          <p>
            {AccessibilityStatementStrings.TECHNICAL_INFORMATION.P1}
          </p>

          <h3 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.COMPLIANCE_STATUS.HEADER}
          </h3>
          <p>
            {AccessibilityStatementStrings.COMPLIANCE_STATUS.P1}
          </p>
          <p>
            {AccessibilityStatementStrings.COMPLIANCE_STATUS.P2}
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.NONACCESSIBLE_CONTENT.HEADER}
          </h2>
          <p>
            {AccessibilityStatementStrings.NONACCESSIBLE_CONTENT.P1}
          </p>
          <h2 className="nhsuk-heading-m">
            {AccessibilityStatementStrings.NONACCESSIBLE_CONTENT.SUBHEADER}
          </h2>
          <ul>
            {AccessibilityStatementStrings.NONACCESSIBLE_CONTENT.SUB_LIST_ITEMS.map((listItem, index) => (
              <li key={index}>{listItem}</li>
            ))}
          </ul>
          <p>
            {AccessibilityStatementStrings.NONACCESSIBLE_CONTENT.P2}
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.HEADER}
          </h2>
          <p>
            {AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.P1}
          </p>
          <h2 className="nhsuk-heading-m">
            {AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.SUBHEADER}
          </h2>
          <p>
            {AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.SUBHEADER_P1}
          </p>
          <p>
            {AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.SUBHEADER_P2}
          </p>
          <p>
            {AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.SUBHEADER_P3}
          </p>
          <p>
            {AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.SUBHEADER_P4}
          </p>
        </div>
      </div>
    </main>
  )
}
