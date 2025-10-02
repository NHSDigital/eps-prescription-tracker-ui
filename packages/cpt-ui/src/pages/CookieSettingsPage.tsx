import React from "react"
import {Link} from "react-router-dom"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"
import {getHomeLink} from "@/helpers/loginFunctions"
import {useAuth} from "@/context/AuthProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {cptAwsRum} from "@/helpers/awsRum"

export default function CookieSettingsPage() {
  const auth = useAuth()
  cptAwsRum.recordPageView()
  return (
    <main className="nhsuk-width-container nhsuk-u-margin-top-4">

      <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb">
        <ol className="nhsuk-breadcrumb__list">
          <li className="nhsuk-breadcrumb__item">
            <Link className="nhsuk-breadcrumb__link" to={getHomeLink(auth.isSignedIn)}>{CookieStrings.home}</Link>
          </li>
          <li className="nhsuk-breadcrumb__item">
            <Link className="nhsuk-breadcrumb__link" to={FRONTEND_PATHS.COOKIES}>{CookieStrings.cookie_policy}</Link>
          </li>
        </ol>
        <p className="nhsuk-breadcrumb__back">
          <a className="nhsuk-breadcrumb__backlink" href="#">
            <span className="nhsuk-u-visually-hidden">
              {CookieStrings.breadcrumbBack.visuallyHidden}&nbsp;</span>
            {CookieStrings.breadcrumbBack.label}
          </a>
        </p>
      </nav>

      <div className="nhsuk-grid-row">
        <div className="nhsuk-grid-column-full">
          <h1 className="nhsuk-heading-xl">{CookieStrings.savedCookieSettings}</h1>

          <p>{CookieStrings.saveSettings}</p>
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
          </p>
          <p className="nhsuk-body-s nhsuk-u-secondary-text-color nhsuk-u-margin-top-0 nhsuk-u-margin-bottom-7">
            {CookieStrings.pageNextReviewed}
          </p>
        </div>
      </div>
    </main>
  )
}
