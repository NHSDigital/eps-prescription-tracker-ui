import React, {useState} from "react"
import {Link, useLocation} from "react-router-dom"
import "../styles/epscookiebanner.scss"

export default function EPSCookieBanner() {
  const [cookiesSet, setCookiesSet] = useState<"accepted" | "rejected" | null>(null)
  const location = useLocation()

  if (location.pathname === "/cookies") return null

  const handleCookieChoice = (choice: "accepted" | "rejected") => {
    setCookiesSet(choice)
  }

  return (
    <>
      {cookiesSet === null && (
        <div className="nhsuk-cookie-banner" id="cookieBanner" role="banner" aria-label="Cookie banner">
          <div className="page-section">
            <div className="nhsuk-width-container">
              <h2 className="nhsuk-cookie-banner__heading govuk-heading-m">
                Cookies on the Clinical prescription tracking service
              </h2>
              <p>We've put some small files called cookies on your device to make our site work.</p>
              <p className="nhsuk-body">
                We’d also like to use analytics cookies.
                These send anonymous information about how our site is used to a service called Amazon CloudWatch RUM.
                We use this information to improve our site.
              </p>
              <p className="nhsuk-body">
                Let us know if this is OK. We'll use a cookie to save your choice. You can{" "}
                <Link to="/cookies">read more about our cookies</Link> before you choose.
              </p>
              <div className="nhsuk-button-group nhsuk-u-margin-bottom-0">
                <button
                  id="accept"
                  type="button"
                  className="nhsuk-button full-width nhsuk-u-margin-right-3"
                  onClick={() => handleCookieChoice("accepted")}
                >
                  Accept analytics cookies
                </button>
                <button
                  id="reject"
                  type="button"
                  className="nhsuk-button full-width"
                  onClick={() => handleCookieChoice("rejected")}
                >
                  Reject analytics cookies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cookiesSet !== null && (
        <div className="chargeable-status-banner--green" id="chargeable-status-banner-id">
          <div className="chargeable-status-banner-content">
            You can change your cookie settings at any time using our{" "}
            <Link to="/cookies" className="chargeable-status-banner-link">
              cookies page
            </Link>.
          </div>
        </div>
      )}
    </>
  )
}
