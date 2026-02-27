import React, {useState, useEffect, Fragment} from "react"
import {Link, useLocation} from "react-router-dom"
import "../styles/epscookies.scss"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"
import {cptAwsRum} from "@/helpers/awsRum"
import {useLocalStorageState} from "@/helpers/useLocalStorageState"

// some explanation about this component
// there are 2 banners in this component - the 'do you accept/reject cookies' banner
// and the 'you have made a cookie selection' banner - the confirmation banner
// you should only see the confirmation banner after you have selected a cookie preference
// after that it should not be shown
// if you click accept/reject on the main banner - we want to show the confirmation banner once
// so we set showConfirmationBanner to true, and epsConfirmationBannerShown to true
// but we can also set cookies on the cookie page
// in which case we also do not want to show the confirmation banner
// which is why it is checked and set in checkCookieConsent

export default function EPSCookieBanner() {
  // this is just local to this page so just use state
  const [showConfirmationBanner, setShowConfirmationBanner] = useState(false)

  // this is shared between this component and cookiePolicyPage so use useLocalStorageState
  const [cookiePreferencesSaved, setCookiePreferencesSaved] =
    useLocalStorageState<boolean>("cookiePreferencesSaved", "cookiePreferencesSaved", false)
  const [epsCookieConsent, setEpsCookieConsent] = useLocalStorageState<"accepted" | "rejected" | null>(
    "epsCookieConsent", "epsCookieConsent", null)
  const [epsConfirmationBannerShown, setEpsConfirmationBannerShown] = useLocalStorageState<boolean>(
    "epsConfirmationBannerShown", "epsConfirmationBannerShown", false)

  const checkCookieConsent = () => {

    if (epsCookieConsent === "accepted" || epsCookieConsent === "rejected") {
      setCookiePreferencesSaved(true)

      if (!epsConfirmationBannerShown) {
        setShowConfirmationBanner(true)
        setEpsConfirmationBannerShown(true)
      }
    } else if (typeof window !== "undefined" && window.NHSCookieConsent?.getConsented()) {
      const hasAnalytics = window.NHSCookieConsent.getStatistics()
      const initialChoice = hasAnalytics ? "accepted" : "rejected"
      setCookiePreferencesSaved(true)
      setEpsCookieConsent(initialChoice)

      setShowConfirmationBanner(true)
      setEpsConfirmationBannerShown(true)
    }
  }

  useEffect(() => {
    //checks cookies on load, and if they are changed from the option on cookie settings page
    checkCookieConsent()
  }, [])

  const location = useLocation()
  useEffect(() => {
    if (location.pathname === "/cookies" && showConfirmationBanner) {
      setShowConfirmationBanner(false)
    }
  }, [location.pathname])

  const handleCookieChoice = (choice: "accepted" | "rejected") => {
    setCookiePreferencesSaved(true)
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

    setShowConfirmationBanner(true)
  }

  return (
    <Fragment>
      {!cookiePreferencesSaved && (
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
                  tabIndex={3}
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
                  tabIndex={1}
                >
                  {CookieStrings.accept_cookies}
                </button>
                <button
                  type="button"
                  className="nhsuk-button full-width"
                  onClick={() => handleCookieChoice("rejected")}
                  data-testid="reject-button"
                  aria-label={CookieStrings.reject_cookies}
                  tabIndex={2}
                >
                  {CookieStrings.reject_cookies}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmationBanner && !epsConfirmationBannerShown && (
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
    </Fragment>
  )
}
