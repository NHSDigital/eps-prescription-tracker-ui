import React, {useState} from "react"
import {Link} from "react-router-dom"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"

interface Cookie {
  name: string;
  purpose: string;
  expiry: string;
}
interface CookieTableProps {
  cookies: Array<Cookie>;
  title: string;
}

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

  const CookieTable: React.FC<CookieTableProps> = ({cookies, title}) => (
    <details
      className="nhsuk-details"
      open={title === "Essential cookies" ? essentialCookiesOpen : analyticsCookiesOpen}
      onToggle={(e) => {
        if (title === "Essential cookies") {
          setEssentialCookiesOpen(e.currentTarget.open)
        } else {
          setAnalyticsCookiesOpen(e.currentTarget.open)
        }
      }}
    >
      <summary
        className="nhsuk-details__summary"
        onClick={(e) => {
          e.preventDefault()
          if (title === "Essential cookies") {
            setEssentialCookiesOpen(!essentialCookiesOpen)
          } else {
            setAnalyticsCookiesOpen(!analyticsCookiesOpen)
          }
        }}
      >
        <span className="nhsuk-details__summary-text">
          See the {title.toLowerCase()} we use
        </span>
      </summary>
      <div className="nhsuk-details__text">
        <table role="table" className="nhsuk-table-responsive">
          <caption className="nhsuk-table__caption nhsuk-u-visually-hidden">
            {title}
          </caption>
          <thead role="rowgroup" className="nhsuk-table__head">
            <tr role="row">
              <th role="columnheader" scope="col">
                Cookie name
              </th>
              <th role="columnheader" scope="col">
                Purpose
              </th>
              <th role="columnheader" scope="col">
                Expiry
              </th>
            </tr>
          </thead>
          <tbody className="nhsuk-table__body">
            {cookies.map((cookie, index) => (
              <tr key={index} role="row" className="nhsuk-table__row">
                <td role="cell" className="nhsuk-table__cell">
                  <span className="nhsuk-table-responsive__heading" aria-hidden="true">Cookie name </span>
                  {cookie.name}
                </td>
                <td role="cell" className="nhsuk-table__cell">
                  <span className="nhsuk-table-responsive__heading" aria-hidden="true">Purpose </span>
                  {cookie.purpose}
                </td>
                <td role="cell" className="nhsuk-table__cell">
                  <span className="nhsuk-table-responsive__heading" aria-hidden="true">Expiry </span>
                  {cookie.expiry}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )

  return (
    <div className="cookie-policy-container">
      <main className="nhsuk-main-wrapper nhsuk-main-wrapper--s" id="main-content" role="main">
        <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb">
          <ol className="nhsuk-breadcrumb__list">
            <li className="nhsuk-breadcrumb__item">
              <Link className="nhsuk-breadcrumb__link" to="/search">{CookieStrings.home}</Link>
            </li>
          </ol>
          <p className="nhsuk-breadcrumb__back">
            <a className="nhsuk-breadcrumb__backlink" href="#">
              <span className="nhsuk-u-visually-hidden">Back to &nbsp;</span>
              Level three
            </a>
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
                />
                <label className="nhsuk-label nhsuk-radios__label" htmlFor="example-2">
                  {CookieStrings.cookieSettings.rejectLabel}
                </label>
              </div>
            </div>
          </fieldset>
        </div>

        <Link className="nhsuk-button" to="/cookies-selected">
          {CookieStrings.cookieSettings.saveButton}
        </Link>

        <h2 className="nhsuk-heading-2">{CookieStrings.changeSettings.heading}</h2>
        <p>{CookieStrings.changeSettings.paragraph1}</p>
        <p>{CookieStrings.changeSettings.paragraph2}</p>
        <p>{CookieStrings.changeSettings.paragraph3}</p>

        <h2 className="nhsuk-heading-l">{CookieStrings.policyChanges.heading}</h2>
        <p>{CookieStrings.policyChanges.paragraph1}</p>
      </main>
    </div>
  )
}

export default CookiePolicyPage
