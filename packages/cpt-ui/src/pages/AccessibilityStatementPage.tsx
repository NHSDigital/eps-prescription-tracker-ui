import React from "react"
import {Link} from "react-router-dom"
import {getHomeLink} from "@/helpers/loginFunctions"
import {Breadcrumb} from "nhsuk-react-components"
import {useAuth} from "@/context/AuthProvider"
import {usePageTitle} from "@/hooks/usePageTitle"
import {AccessibilityStatementStrings} from "@/constants/ui-strings/AccessibilityStatementStrings"

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
          <p>This accessibility statement applies to the Prescription Tracker.
This website is run by NHS England. We want as many people as possible to be able to use this website.
For example, that means you should be able to:<br /></p>
          <ul>
            <li>change colours, contrast levels and fonts using browser or device settings</li>
            <li>zoom in up to 400% without the text spilling off the screen</li>
            <li>navigate most of the website using a keyboard or speech recognition software</li>
            <li>
              listen to most of the website using a screen reader (including the most recent versions of JAWS, NVDA
              and VoiceOver)
            </li>
          </ul>

          <p>
            We’ve also made the website text as simple as possible to understand.

            <a href="" target="_blank">AbilityNet (opens in new tab) </a>
            has advice on making your device easier to use if you have a disability.
          </p>

          <h2 className="nhsuk-heading-l">
            How accessible this website is
          </h2>
          <p>
            We know some parts of this website are not fully accessible:
          </p>
          <ul>
            <li>screenreaders do not continue to read content when you select a new tab on the ‘Search for a prescription’ page</li>
            <li>using the tab key does not focus the ‘Skip to main content’ link after a page is loaded</li>
            <li>if you click into a page after it is loaded, using the tab key does not focus the next element of the page</li>
            <li>the hint text is not associated with the search field on the prescription ID tab on the ‘Search for a prescription’ page</li>
            <li>the cards on the ‘Select your role’ page should stay white when focused or hovered over</li>
            <li>on smaller screens, there is no aria-expanded attribute on the menu icon</li>
            <li>when you enter information into a field on the ‘Search for a prescription’ page and search, the page refreshes and focus is moved to the footer if you are navigating using arrow keys</li>
            <li>the tabs on the ‘Prescription List’ page are separate URLs with the same headings and page titles, instead of the same URL with different fragment identifiers</li>
            <li>selecting the tabs on the ‘Search for a prescription’ page should show you unique headings and page titles because each tab is a separate URL</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
