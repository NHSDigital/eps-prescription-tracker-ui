import React, {useState, useEffect} from "react"
import {Link, useLocation} from "react-router-dom"
import "../styles/epscookies.scss"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"
import {cptAwsRum} from "@/helpers/awsRum"
import {useLocalStorageState} from "@/helpers/useLocalStorageState"

export default function EPSCookieBanner() {
  // this is just local to this page so just use state
  const [showSecondaryBanner, setShowSecondaryBanner] = useState(false)

  // this is shared between this component and cookiePolicyPage so use useLocalStorageState
  const [cookiesSet, setCookiesSet] = useLocalStorageState<boolean>("setCookiesSet", "setCookiesSet", false)
  const [epsCookieConsent, setEpsCookieConsent] = useLocalStorageState<"accepted" | "rejected" | null>(
    "epsCookieConsent", "epsCookieConsent", null)
  const [epsSecondaryBannerShown, setEpsSecondaryBannerShown] = useLocalStorageState<boolean>(
    "epsSecondaryBannerShown", "epsSecondaryBannerShown", false)

  const checkCookieConsent = () => {

    if (epsCookieConsent === "accepted" || epsCookieConsent === "rejected") {
      setCookiesSet(true)

      if (!epsSecondaryBannerShown) {
        setShowSecondaryBanner(true)
        setEpsSecondaryBannerShown(true)
      }
    } else if (typeof window !== "undefined" && window.NHSCookieConsent?.getConsented()) {
      const hasAnalytics = window.NHSCookieConsent.getStatistics()
      const initialChoice = hasAnalytics ? "accepted" : "rejected"
      setCookiesSet(true)
      setEpsCookieConsent(initialChoice)

      setShowSecondaryBanner(true)
      setEpsSecondaryBannerShown(true)
    }
  }

  useEffect(() => {
    //checks cookies on load, and if they are changed from the option on cookie settings page
    checkCookieConsent()
  }, [])

  const location = useLocation()
  useEffect(() => {
    if (location.pathname === "/cookies" && showSecondaryBanner) {
      setShowSecondaryBanner(false)
    }
  }, [location.pathname])

  const handleCookieChoice = (choice: "accepted" | "rejected") => {
    setCookiesSet(true)
    setEpsCookieConsent(choice)
    if (choice === "accepted") {
      cptAwsRum.enable()
    } else {
      cptAwsRum.disable()
    }

    if (typeof window !== "undefined" && window.NHSCookieConsent) {
      window.NHSCookieConsent.setStatistics(choice === "accepted")
      window.NHSCookieConsent.setConsented(true)
    }

    setShowSecondaryBanner(true)
    //setEpsSecondaryBannerShown(true)
  }

  return (
    <>
      {!cookiesSet && (
        <div
          className="nhsuk-cookie-banner"
          data-testid="cookieBanner"
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

      {showSecondaryBanner && !epsSecondaryBannerShown && (
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
              aria-label={CookieStrings.cookieBannerLink}
            >
              {CookieStrings.cookies_page}
            </Link>.
          </div>
        </div>
      )}
    </>
  )
}
