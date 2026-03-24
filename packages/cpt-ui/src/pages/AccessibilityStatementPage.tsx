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
        <div className="nhsuk-grid-column-full" data-testid="accessibility-statement-content">
          <h1 className="nhsuk-heading-xl">{AccessibilityStatementStrings.header}</h1>
          <p><EpsRichText content={AccessibilityStatementStrings.openingSection.p1} /></p>
          <p>{AccessibilityStatementStrings.openingSection.p2}</p>
          <ul>
            {AccessibilityStatementStrings.openingSection.listItems.map((listItem, index) => (
              <li key={index}>{listItem}</li>
            ))}
          </ul>

          <p>{AccessibilityStatementStrings.openingSection.p3}</p>
          <p><EpsRichText content={AccessibilityStatementStrings.openingSection.p4} /></p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.knownIssues.header}
          </h2>
          <p>
            {AccessibilityStatementStrings.knownIssues.p1}
          </p>
          <ul>
            {AccessibilityStatementStrings.knownIssues.listItems.map((listItem, index) => (
              <li key={index}>{listItem}</li>
            ))}
          </ul>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.feedbackContactInformation.header}
          </h2>
          <p>
            <EpsRichText content={AccessibilityStatementStrings.feedbackContactInformation.p1} />
          </p>
          <p>
            <EpsRichText content={AccessibilityStatementStrings.feedbackContactInformation.p2} />
          </p>
          <p>
            {AccessibilityStatementStrings.feedbackContactInformation.p3}
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.enforcementProcedure.header}
          </h2>
          <p>
            <EpsRichText content={AccessibilityStatementStrings.enforcementProcedure.p1} />
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.technicalInformation.header}
          </h2>
          <p>
            {AccessibilityStatementStrings.technicalInformation.p1}
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.complianceStatus.header}
          </h2>
          <p>
            {AccessibilityStatementStrings.complianceStatus.p1}
          </p>
          <p>
            {AccessibilityStatementStrings.complianceStatus.p2}
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.nonaccessibleContent.header}
          </h2>
          <p>
            {AccessibilityStatementStrings.nonaccessibleContent.p1}
          </p>
          <h2 className="nhsuk-heading-m">
            {AccessibilityStatementStrings.nonaccessibleContent.subheader}
          </h2>
          <ul>
            {AccessibilityStatementStrings.nonaccessibleContent.subListItems.map((listItem, index) => (
              <li key={index}>{listItem}</li>
            ))}
          </ul>
          <p>
            {AccessibilityStatementStrings.nonaccessibleContent.p2}
          </p>

          <h2 className="nhsuk-heading-l">
            {AccessibilityStatementStrings.improvingAccessibility.header}
          </h2>
          <p>
            {AccessibilityStatementStrings.improvingAccessibility.p1}
          </p>
          <h2 className="nhsuk-heading-m">
            {AccessibilityStatementStrings.improvingAccessibility.subheader}
          </h2>
          <p>
            {AccessibilityStatementStrings.improvingAccessibility.subheaderP1}
          </p>
          <p>
            {AccessibilityStatementStrings.improvingAccessibility.subheaderP2}
          </p>
          <p>
            {AccessibilityStatementStrings.improvingAccessibility.subheaderP3}
          </p>
          <p>
            {AccessibilityStatementStrings.improvingAccessibility.subheaderP4}
          </p>
        </div>
      </div>
    </main>
  )
}
