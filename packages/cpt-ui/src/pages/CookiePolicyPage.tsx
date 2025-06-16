import React, {useState, useEffect} from "react"
import {Link, useNavigate} from "react-router-dom"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"
import CookieTable, {Cookie} from "@/components/CookieTable"
import {cptAwsRum} from "@/helpers/awsRum"
import {useAuth} from "@/context/AuthProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {useLocalStorageState} from "@/helpers/useLocalStorageState"

const CookiePolicyPage = () => {
  const essentialCookies: Array<Cookie> = CookieStrings.essential

  const analyticsCookies: Array<Cookie> = CookieStrings.analytics

  const [essentialCookiesOpen, setEssentialCookiesOpen] = useState<boolean>(false)
  const [analyticsCookiesOpen, setAnalyticsCookiesOpen] = useState<boolean>(false)

  // values needed for local rendering
  const [hasInitialized, setHasInitialized] = useState<boolean>(false)
  const [localCookieChoice, setLocalCookieChoice] = useState<"accepted" | "rejected">("rejected")

  // these are shared between this page and the cookie banner component so use useLocalStorageState
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cookiesSet, setCookiesSet] = useLocalStorageState<boolean>("setCookiesSet", "setCookiesSet", false)
  const [epsCookieConsent, setEpsCookieConsent] = useLocalStorageState<"accepted" | "rejected" | null>(
    "epsCookieConsent", "epsCookieConsent", null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [epsSecondaryBannerShown, setEpsSecondaryBannerShown] = useLocalStorageState<boolean>(
    "epsSecondaryBannerShown", "epsSecondaryBannerShown", false)

  const navigate = useNavigate()
  const auth = useAuth()

  const getHomeLink = () => {
    return auth.isSignedIn ? FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID : FRONTEND_PATHS.LOGIN
  }

  useEffect(() => {
    if (hasInitialized) {
      return
    }

    if (epsCookieConsent === "accepted" || epsCookieConsent === "rejected") {
      setLocalCookieChoice(epsCookieConsent)
    } else if (typeof window !== "undefined" && window.NHSCookieConsent?.getConsented()) {
      const hasAnalytics = window.NHSCookieConsent.getStatistics()
      const initialChoice = hasAnalytics ? "accepted" : "rejected"
      setLocalCookieChoice(initialChoice)
      setEpsCookieConsent(initialChoice)
      setCookiesSet(true)
    } else {
      setCookiesSet(false)
    }

    setHasInitialized(true)
  }, [hasInitialized])

  const handleCookieChoice = (choice: "accepted" | "rejected", saveState: boolean) => {
    if (saveState) {
      if (choice === "accepted") {
        cptAwsRum.enable()
      } else {
        cptAwsRum.disable()
      }
      setCookiesSet(true)
      setEpsCookieConsent(choice)
      setEpsSecondaryBannerShown(true)
      if (typeof window !== "undefined" && window.NHSCookieConsent) {
        window.NHSCookieConsent.setStatistics(choice === "accepted")
        window.NHSCookieConsent.setConsented(true)
      }

    }
    setLocalCookieChoice(choice)
  }

  return (
    <div className="nhsuk-width-container nhsuk-u-margin-top-4">
      <main className="nhsuk-main-wrapper nhsuk-main-wrapper--s" id="main-content" role="main">
        <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb">
          <ol className="nhsuk-breadcrumb__list">
            <li className="nhsuk-breadcrumb__item">
              <Link className="nhsuk-breadcrumb__link" to={getHomeLink()}>{CookieStrings.home}</Link>
            </li>
          </ol>
          <p className="nhsuk-breadcrumb__back">
            <Link className="nhsuk-breadcrumb__backlink" to={getHomeLink()}>
              <span className="nhsuk-u-visually-hidden">
                {CookieStrings.breadcrumbBack.visuallyHidden}&nbsp;</span>
              {CookieStrings.home}
            </Link>
          </p>
        </nav>
        <h1 className="nhsuk-heading-xl">{CookieStrings.cptCookies}</h1>
        <p>
          {CookieStrings.intro.paragraph1.split("privacy policy")[0]}
          <a href="#">{CookieStrings.intro.privacyPolicyText}</a>
          {CookieStrings.intro.paragraph1.split("privacy policy")[1]}
        </p>

        <h2 className="nhsuk-heading-l">{CookieStrings.whatAreCookies.heading}
        </h2>
        <p>{CookieStrings.whatAreCookies.paragraph1}</p>
        <p>{CookieStrings.whatAreCookies.paragraph2}</p>
        <p>{CookieStrings.whatAreCookies.paragraph3}</p>
        <h2 className="nhsuk-heading-l">{CookieStrings.howWeUseCookies.heading}
        </h2>
        <p>{CookieStrings.howWeUseCookies.paragraph1}</p>
        <p>{CookieStrings.howWeUseCookies.paragraph2}</p>
        <h2 className="nhsuk-heading-l">{CookieStrings.essentialCookies.heading}</h2>
        <CookieTable
          cookies={essentialCookies}
          title={CookieStrings.essentialCookies.tableTitle}
          isOpen={essentialCookiesOpen}
          onToggle={setEssentialCookiesOpen}
        />

        <h2 className="nhsuk-heading-l">{CookieStrings.analyticsCookies.heading}</h2>
        <p>
          {CookieStrings.analyticsCookies.paragraph1.split("Amazon CloudWatch RUM privacy policy")[0]}
          <a href="#">{CookieStrings.analyticsCookies.policyLinkText}</a>
          {CookieStrings.analyticsCookies.paragraph1.split("Amazon CloudWatch RUM privacy policy")[1]}
        </p>

        <CookieTable
          cookies={analyticsCookies}
          title={CookieStrings.analyticsCookies.tableTitle}
          isOpen={analyticsCookiesOpen}
          onToggle={setAnalyticsCookiesOpen}
        />

        <div className="nhsuk-form-group">
          <fieldset className="nhsuk-fieldset">
            <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--m">
              <h3 className="nhsuk-fieldset__heading">
                {CookieStrings.cookieSettings.heading}
              </h3>
            </legend>
            <div className="nhsuk-radios">
              <div className="nhsuk-radios__item">
                <input
                  className="nhsuk-radios__input"
                  id="example-1"
                  name="cookie-measure"
                  type="radio"
                  value="yes"
                  checked={localCookieChoice === "accepted"}
                  onChange={() => handleCookieChoice("accepted", false)}
                  data-testid="accept-analytics-cookies"
                />
                <label className="nhsuk-label nhsuk-radios__label" htmlFor="example-1">
                  {CookieStrings.cookieSettings.acceptLabel}
                </label>
              </div>
              <div className="nhsuk-radios__item">
                <input
                  className="nhsuk-radios__input"
                  id="example-2"
                  name="cookie-measure"
                  type="radio"
                  value="no"
                  checked={localCookieChoice === "rejected"}
                  onChange={() => handleCookieChoice("rejected", false)}
                  data-testid="reject-analytics-cookies"
                />
                <label
                  className="nhsuk-label nhsuk-radios__label"
                  htmlFor="example-2"
                >
                  {CookieStrings.cookieSettings.rejectLabel}
                </label>
              </div>
            </div>
          </fieldset>
        </div>
        <button
          className="nhsuk-button"
          onClick={() => {
            handleCookieChoice(localCookieChoice, true)
            navigate("/cookies-selected")
          }}
          data-testid="save-cookie-preferences">
          {CookieStrings.cookieSettings.saveButton}
        </button>

        <h2 className="nhsuk-heading-2">{CookieStrings.changeSettings.heading}</h2>
        <p>{CookieStrings.changeSettings.paragraph1}</p>
        <p>{CookieStrings.changeSettings.paragraph2}</p>
        <p>{CookieStrings.changeSettings.paragraph3}</p>

        <h2 className="nhsuk-heading-l">{CookieStrings.policyChanges.heading}</h2>
        <p className="bottomPolicyText">{CookieStrings.policyChanges.paragraph1}</p>
        <p className="nhsuk-body-s nhsuk-u-secondary-text-color nhsuk-u-margin-top-7 nhsuk-u-margin-bottom-0">
          {CookieStrings.pageLastReviewed}
        </p>
        <p className="nhsuk-body-s nhsuk-u-secondary-text-color nhsuk-u-margin-top-0 nhsuk-u-margin-bottom-7">
          {CookieStrings.pageNextReviewed}
        </p>
      </main>
    </div>
  )
}

export default CookiePolicyPage
