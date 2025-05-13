import React from "react"
import {Link} from "react-router-dom"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"

export default function CookieSettingsPage() {
  return (
    <main className="cookie-policy-container">
      <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb">
        <ol className="nhsuk-breadcrumb__list">
          <li className="nhsuk-breadcrumb__item">
            <Link className="nhsuk-breadcrumb__link" to="/search">{CookieStrings.home}</Link>
          </li>
          <li className="nhsuk-breadcrumb__item">
            <Link className="nhsuk-breadcrumb__link" to="/cookies">{CookieStrings.cookie_policy}</Link>
          </li>
        </ol>
        <p className="nhsuk-breadcrumb__back">
          <a className="nhsuk-breadcrumb__backlink" href="#">
            <span className="nhsuk-u-visually-hidden">Back to&nbsp;</span>
            Level three
          </a>
        </p>
      </nav>

      <div className="nhsuk-grid-row">
        <div className="nhsuk-grid-column-full">
          <h1 className="nhsuk-heading-xl">{CookieStrings.savedCookieSettings}</h1>

          <p>{CookieStrings.saveSettings}.</p>
          <p>{CookieStrings.questionSaveSettings}</p>

          <ul>
            <li>{CookieStrings.oneYear}</li>
            <li>{CookieStrings.newCookies}</li>
          </ul>

          <p>
            {CookieStrings.also}
            <Link to="/cookies">{CookieStrings.cookieChoose}</Link>
            {CookieStrings.anyTime}
          </p>

          <p className="nhsuk-body-s nhsuk-u-secondary-text-color nhsuk-u-margin-top-7 nhsuk-u-margin-bottom-0">
            {CookieStrings.pageLastReviewed}
            {CookieStrings.pageNextReviewed}
          </p>
        </div>
      </div>
    </main>
  )
}
