import React from "react"
import {Link} from "react-router-dom"

export default function CookieSettingsPage() {
  return (
    <main className="nhsuk-navigation-container">
      <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb">
        <ol className="nhsuk-breadcrumb__list">
          <li className="nhsuk-breadcrumb__item">
            <Link className="nhsuk-breadcrumb__link" to="/search">Home</Link>
          </li>
          <li className="nhsuk-breadcrumb__item">
            <Link className="nhsuk-breadcrumb__link" to="/cookies">Cookie policy</Link>
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
          <h1 className="nhsuk-heading-xl">Your cookie settings have been saved</h1>

          <p>We'll save your settings for a year.</p>
          <p>We'll ask you if you're still OK with us using cookies when either:</p>

          <ul>
            <li>it's been a year since you last saved your settings</li>
            <li>we add any new cookies or change the cookies we use</li>
          </ul>

          <p>
            You can also{" "}
            <Link to="/cookies">choose which cookies we use</Link>{" "}
            at any time.
          </p>

          <p className="nhsuk-body-s nhsuk-u-secondary-text-color nhsuk-u-margin-top-7 nhsuk-u-margin-bottom-0">
            Page last reviewed: 15 March 2025<br />
            Next review due: 15 March 2026
          </p>
        </div>
      </div>
    </main>
  )
}
