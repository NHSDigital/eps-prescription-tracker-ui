import React from "react"
import {Link} from "react-router-dom"
import {PrivacyNoticeStrings} from "@/constants/ui-strings/PrivacyNoticeStrings"
import {createEmailLink, createPhoneLink} from "@/helpers/contactFunctions"
import {contactInfo} from "@/helpers/contactInfo"
import {getHomeLink} from "@/helpers/loginFunctions"

export default function PrivacyNoticePage() {

  return (
    <main className="nhsuk-width-container nhsuk-u-margin-top-4">
      <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb">
        <p className="nhsuk-breadcrumb__item">
          <Link className="nhsuk-breadcrumb__link" to={getHomeLink()}>{PrivacyNoticeStrings.home}</Link>
        </p>
      </nav>

      <div className="nhsuk-grid-row">
        <div className="nhsuk-grid-column-full" data-testid="privacy-notice-content">
          <h1 className="nhsuk-heading-xl">{PrivacyNoticeStrings.header}</h1>

          <h2 className="nhsuk-heading-l">{PrivacyNoticeStrings.intro.header}</h2>
          <p>{PrivacyNoticeStrings.intro.welcome}</p>
          <ul>
            <li>{PrivacyNoticeStrings.intro.p1}</li>
            <li>{PrivacyNoticeStrings.intro.p2}</li>
            <li>{PrivacyNoticeStrings.intro.p3}</li>
            <li>{PrivacyNoticeStrings.intro.p4}</li>
            <li>{PrivacyNoticeStrings.intro.p5}</li>
          </ul>

          <h2 className="nhsuk-heading-l">{PrivacyNoticeStrings.about.header}</h2>
          <p>{PrivacyNoticeStrings.about.body}</p>

          <h2 className="nhsuk-heading-l">{PrivacyNoticeStrings.dataCollected.header}</h2>
          <p>{PrivacyNoticeStrings.dataCollected.explanation}</p>
          <ul>
            <li>{PrivacyNoticeStrings.dataCollected.identifiable}
              <Link to=
                "https://digital.nhs.uk/services/care-identity-service/applications-and-services/cis2-authentication">
                {PrivacyNoticeStrings.dataCollected.cis2Link}</Link>
              {PrivacyNoticeStrings.dataCollected.stores}
            </li>
            <li>{PrivacyNoticeStrings.dataCollected.usage}</li>
            <li>{PrivacyNoticeStrings.dataCollected.device}</li>
          </ul>

          <h2 className="nhsuk-heading-l">{PrivacyNoticeStrings.dataSource.header}</h2>
          <p>{PrivacyNoticeStrings.dataSource.body}</p>

          <h2 className="nhsuk-heading-l">{PrivacyNoticeStrings.usage.header}</h2>
          <p>{PrivacyNoticeStrings.usage.explanation}</p>
          <ul>
            <li>{PrivacyNoticeStrings.usage.functionality}</li>
            <li>
              {PrivacyNoticeStrings.usage.serviceImprovement}
              <Link to="/cookies">{PrivacyNoticeStrings.usage.cookie}</Link>
            </li>
            <li>{PrivacyNoticeStrings.usage.audit}</li>
            <li>{PrivacyNoticeStrings.usage.answer}</li>
            <li>{PrivacyNoticeStrings.usage.legal}</li>
          </ul>

          <h2 className="nhsuk-heading-l">
            {PrivacyNoticeStrings.legal.header}
          </h2>
          <p>{PrivacyNoticeStrings.legal.basis}</p>
          <ol>
            <li>
              {PrivacyNoticeStrings.legal.base1}
              <Link to={contactInfo.links.legalLink}>
                {PrivacyNoticeStrings.legal.basesLink}</Link>
            </li>
            <li>
              {PrivacyNoticeStrings.legal.base2}
              <Link to={contactInfo.links.legalLink}>
                {PrivacyNoticeStrings.legal.basesLink}</Link>
            </li>
          </ol>
          <p>
            {PrivacyNoticeStrings.legal.note}
            <Link to={contactInfo.links.legalLink}>
              {PrivacyNoticeStrings.legal.basesLink}</Link>
          </p>

          <h2 className="nhsuk-heading-l">{PrivacyNoticeStrings.sharing.header}</h2>
          <p>
            {PrivacyNoticeStrings.sharing.mayShare}
          </p>
          <ul>
            <li>
              {PrivacyNoticeStrings.sharing.share1}
            </li>
            <li>
              {PrivacyNoticeStrings.sharing.share2}
            </li>
          </ul>
          <h2 className="nhsuk-heading-l">{PrivacyNoticeStrings.retention.header}</h2>
          <p>
            {PrivacyNoticeStrings.retention.note}
          </p>
          <ul>
            <li>
              {PrivacyNoticeStrings.retention.account}
            </li>
            <li>
              {PrivacyNoticeStrings.retention.system}
            </li>
            <li>
              {PrivacyNoticeStrings.retention.analytics}
            </li>
          </ul>

          <h2 className="nhsuk-heading-l">
            {PrivacyNoticeStrings.storage.header}
          </h2>
          <p>
            {PrivacyNoticeStrings.storage.body}
          </p>

          <h2 className="nhsuk-heading-l">
            {PrivacyNoticeStrings.rights.header}</h2>
          <p>
            {PrivacyNoticeStrings.rights.contact}
            {createEmailLink(contactInfo.emails.dpo)}
          </p>
          <ol>
            <li>
              {PrivacyNoticeStrings.rights.rights1}
            </li>
            <li>
              {PrivacyNoticeStrings.rights.rights2}
              <Link to={contactInfo.links.personalData}>
                {PrivacyNoticeStrings.rights.rights2Link}
              </Link>
            </li>
            <li>
              {PrivacyNoticeStrings.rights.rights3}
            </li>
            <li>
              {PrivacyNoticeStrings.rights.rights4}
            </li>
            <li>
              {PrivacyNoticeStrings.rights.rights5}
              <Link to="/cookies">
                {PrivacyNoticeStrings.rights.cookieLink}
              </Link>
            </li>
          </ol>

          <div className="nhsuk-inset-text">
            <span className="nhsuk-u-visually-hidden">Information: </span>
            <p> {PrivacyNoticeStrings.rights.method}
              {createEmailLink(contactInfo.emails.general)}
            </p>
          </div>

          <h2 className="nhsuk-heading-l">
            {PrivacyNoticeStrings.changes.header}
          </h2>
          <p>{PrivacyNoticeStrings.changes.body}</p>

          <h2 className="nhsuk-heading-l">
            {PrivacyNoticeStrings.security.header}
          </h2>
          <p>
            {PrivacyNoticeStrings.security.body}
          </p>

          <h2 className="nhsuk-heading-l">
            {PrivacyNoticeStrings.contact.header}
          </h2>
          <p>
            {PrivacyNoticeStrings.contact.dpo}
            {createEmailLink(contactInfo.emails.dpo)}
          </p>
          <p style={{marginBottom: "50px"}}>
            {PrivacyNoticeStrings.contact.ico}
            {createPhoneLink(contactInfo.phones.ico)}
            {PrivacyNoticeStrings.contact.or}
            <a href={contactInfo.links.icoComplaint}>{PrivacyNoticeStrings.contact.complain} </a>
          </p>
        </div>
      </div>
    </main>
  )
}
