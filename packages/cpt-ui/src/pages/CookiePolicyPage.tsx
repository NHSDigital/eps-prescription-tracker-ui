import React, {useState, useEffect} from "react"
import {Link, useNavigate} from "react-router-dom"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"
import {isUserLoggedIn} from "@/helpers/cookiesFunctions"
import CookieTable, {Cookie} from "@/components/CookieTable"

const CookiePolicyPage = () => {
  const essentialCookies: Array<Cookie> = [
    {
      name: CookieStrings.essential.name1,
      purpose: CookieStrings.essential.purpose1,
      expiry: CookieStrings.essential.expiry1
    },
    {
      name: CookieStrings.essential.name2,
      purpose: CookieStrings.essential.purpose2,
      expiry: CookieStrings.essential.expiry2
    },
    {
      name: CookieStrings.essential.name3,
      purpose: CookieStrings.essential.purpose3,
      expiry: CookieStrings.essential.expiry3
    },
    {
      name: CookieStrings.essential.name4,
      purpose: CookieStrings.essential.purpose4,
      expiry: CookieStrings.essential.expiry4
    },
    {
      name: CookieStrings.essential.name5,
      purpose: CookieStrings.essential.purpose5,
      expiry: CookieStrings.essential.expiry5
    },
    {
      name: CookieStrings.essential.name6,
      purpose: CookieStrings.essential.purpose6,
      expiry: CookieStrings.essential.expiry6
    },
    {
      name: CookieStrings.essential.name7,
      purpose: CookieStrings.essential.purpose7,
      expiry: CookieStrings.essential.expiry7
    }
  ]

  const analyticsCookies: Array<Cookie> = [
    {
      name: CookieStrings.analytics.name1,
      purpose: CookieStrings.analytics.purpose1,
      expiry: CookieStrings.analytics.expiry1
    },
    {
      name: CookieStrings.analytics.name2,
      purpose: CookieStrings.analytics.purpose2,
      expiry: CookieStrings.analytics.expiry2
    }
  ]

  const [essentialCookiesOpen, setEssentialCookiesOpen] = useState<boolean>(false)
  const [analyticsCookiesOpen, setAnalyticsCookiesOpen] = useState<boolean>(false)

  const [cookieChoice, setCookieChoice] = useState<"accepted" | "rejected">("rejected")
  const [hasInitialized, setHasInitialized] = useState(false)

  const navigate = useNavigate()

  const getHomeLink = () => {
    return isUserLoggedIn() ? "/search" : "/login"
  }

  useEffect(() => {
    if (hasInitialized) {
      return
    }

    const storedChoice = localStorage.getItem("eps-cookie-consent")

    if (storedChoice === "accepted" || storedChoice === "rejected") {
      setCookieChoice(storedChoice)
    } else if (typeof window !== "undefined" && window.NHSCookieConsent?.getConsented()) {
      const hasAnalytics = window.NHSCookieConsent.getStatistics()
      const initialChoice = hasAnalytics ? "accepted" : "rejected"
      setCookieChoice(initialChoice)
    } else {
      setCookieChoice("rejected")
    }

    setHasInitialized(true)
  }, [hasInitialized])

  const handleCookieChoice = (choice: "accepted" | "rejected") => {
    setCookieChoice(choice)
    localStorage.setItem("eps-cookie-consent", choice)

    if (typeof window !== "undefined" && window.NHSCookieConsent) {
      window.NHSCookieConsent.setStatistics(choice === "accepted")
      window.NHSCookieConsent.setConsented(true)
    }

    localStorage.setItem("eps-secondary-banner-shown", "true")

    window.dispatchEvent(new CustomEvent("cookieChoiceUpdated"))
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
          {CookieStrings.intro.paragraph1.split("privacy notice")[0]}
          <a href="/site/privacy-notice">{CookieStrings.intro.privacyPolicyText}</a>
          {CookieStrings.intro.paragraph1.split("privacy notice")[1]}
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
                  checked={cookieChoice === "accepted"}
                  onChange={() => handleCookieChoice("accepted")}
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
                  checked={cookieChoice === "rejected"}
                  onChange={() => handleCookieChoice("rejected")}
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
            handleCookieChoice(cookieChoice)
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
