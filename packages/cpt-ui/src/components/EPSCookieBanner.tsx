import React, {useState} from "react"
import {Link, useLocation} from "react-router-dom"
import "../styles/epscookiebanner.scss"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"

export default function EPSCookieBanner() {
  const [cookiesSet, setCookiesSet] = useState<"accepted" | "rejected" | null>(null)
  const location = useLocation()

  if (location.pathname === "/cookies") return null

  const handleCookieChoice = (choice: "accepted" | "rejected") => {
    setCookiesSet(choice)

    if (typeof window !== "undefined" && window.NHSCookieConsent) {
      if (choice === "accepted") {
        window.NHSCookieConsent.setStatistics(true)
      } else {
        window.NHSCookieConsent.setStatistics(false)
      }

      window.NHSCookieConsent.setConsented(true)
    } else {
      console.warn("NHSCookieConsent API not available on window object.")
    }
  }

  return (
    <>
      {cookiesSet === null && (
        <div className="nhsuk-cookie-banner" id="cookieBanner" role="banner" aria-label={CookieStrings.cookie_banner}>
          <div className="page-section">
            <div className="nhsuk-width-container">
              <h2
                className="nhsuk-cookie-banner-heading"
                data
              >
                {CookieStrings.banner.cookie_title}
              </h2>
              <p className="nhsuk-body">
                {CookieStrings.banner.cookie_text_p1}
              </p>
              <p className="nhsuk-body">
                {CookieStrings.banner.cookie_text_p2}
              </p>
              <p className="nhsuk-body">
                {CookieStrings.banner.cookie_text_p3}
                <Link
                  to={CookieStrings.cookies_page_link}
                  className="cookie_info_link"
                >{CookieStrings.banner.cookies_info_link_text}
                </Link>
                {CookieStrings.banner.cookie_text_p4}
              </p>
              <div className="nhsuk-button-group nhsuk-u-margin-bottom-0">
                <button
                  id="accept"
                  type="button"
                  className="nhsuk-button full-width nhsuk-u-margin-right-3"
                  onClick={() => handleCookieChoice("accepted")}
                >
                  {CookieStrings.accept_cookies}
                </button>
                <button
                  id="reject"
                  type="button"
                  className="nhsuk-button full-width"
                  onClick={() => handleCookieChoice("rejected")}
                >
                  {CookieStrings.reject_cookies}
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
