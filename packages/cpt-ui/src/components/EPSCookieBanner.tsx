import React, {useState, useEffect} from "react"
import {Link, useLocation} from "react-router-dom"
import "../styles/epscookies.scss"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"

export default function EPSCookieBanner() {
  const [cookiesSet, setCookiesSet] = useState<"accepted" | "rejected" | null>(null)
  const [showSecondaryBanner, setShowSecondaryBanner] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const storedChoice = localStorage.getItem("eps-cookie-consent")
    const secondaryShown = localStorage.getItem("eps-secondary-banner-shown")

    if (storedChoice === "accepted" || storedChoice === "rejected") {
      setCookiesSet(storedChoice)

      if (secondaryShown !== "true") {
        setShowSecondaryBanner(true)
        localStorage.setItem("eps-secondary-banner-shown", "true")
      }
    } else if (typeof window !== "undefined" && window.NHSCookieConsent?.getConsented()) {
      const hasAnalytics = window.NHSCookieConsent.getStatistics()
      const initialChoice = hasAnalytics ? "accepted" : "rejected"
      setCookiesSet(initialChoice)
      localStorage.setItem("eps-cookie-consent", initialChoice)

      setShowSecondaryBanner(true)
      localStorage.setItem("eps-secondary-banner-shown", "true")
    }
  }, [])

  const handleCookieChoice = (choice: "accepted" | "rejected") => {
    setCookiesSet(choice)
    localStorage.setItem("eps-cookie-consent", choice)

    if (typeof window !== "undefined" && window.NHSCookieConsent) {
      window.NHSCookieConsent.setStatistics(choice === "accepted")
      window.NHSCookieConsent.setConsented(true)
    }

    setShowSecondaryBanner(true)
    localStorage.setItem("eps-secondary-banner-shown", "true")
  }

  if (location.pathname === "/cookies" || location.pathname === "/cookies-selected") {
    return null
  }

  return (
    <>
      {cookiesSet === null && (
        <div
          className="nhsuk-cookie-banner"
          data-testid="cookieBanner"
          role="banner"
          aria-label={CookieStrings.cookie_banner}
        >
          <div className="page-section">
            <div className="nhsuk-width-container">
              <h2
                className="nhsuk-cookie-banner-heading"
                data-testid="cookieTitle"
              >
                {CookieStrings.banner.cookie_title}
              </h2>
              <p className="nhsuk-body">{CookieStrings.banner.cookie_text_p1}</p>
              <p className="nhsuk-body">{CookieStrings.banner.cookie_text_p2}</p>
              <p className="nhsuk-body">
                {CookieStrings.banner.cookie_text_p3}
                <Link
                  to={CookieStrings.cookies_page_link}
                  className="cookie_info_link"
                  data-testid="cookieInfoLink"
                  aria-label={CookieStrings.banner.cookies_info_link_text}
                >
                  {CookieStrings.banner.cookies_info_link_text}
                </Link>
                {CookieStrings.banner.cookie_text_p4}
              </p>
              <div className="nhsuk-button-group nhsuk-u-margin-bottom-0">
                <button
                  type="button"
                  className="nhsuk-button full-width nhsuk-u-margin-right-3"
                  onClick={() => handleCookieChoice("accepted")}
                  data-testid="accept-button"
                  aria-label={CookieStrings.accept_cookies}
                >
                  {CookieStrings.accept_cookies}
                </button>
                <button
                  type="button"
                  className="nhsuk-button full-width"
                  onClick={() => handleCookieChoice("rejected")}
                  data-testid="reject-button"
                  aria-label={CookieStrings.reject_cookies}
                >
                  {CookieStrings.reject_cookies}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSecondaryBanner && (
        <div
          className="chargeable-status-banner--green"
          id="chargeable-status-banner-id"
          data-testid="secondaryCookieBanner"
        >
          <div className="chargeable-status-banner-content">
            {CookieStrings.text_linking_to_info_page}
            <Link
              to="/cookies"
              className="chargeable-status-banner-link"
              data-testid="smallCookieBannerLink"
              aria-label={CookieStrings.cookie_banner_link}
            >
              {CookieStrings.cookies_page}
            </Link>.
          </div>
        </div>
      )}
    </>
  )
}
