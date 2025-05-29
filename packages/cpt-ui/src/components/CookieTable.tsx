import React from "react"
import {CookieStrings} from "@/constants/ui-strings/CookieStrings"

export interface Cookie {
  name: string;
  purpose: string;
  expiry: string;
}

export interface CookieTableProps {
  cookies: Array<Cookie>;
  title: string;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

const CookieTable: React.FC<CookieTableProps> = ({cookies, title, isOpen, onToggle}) => (
  <details
    className="nhsuk-details"
    open={isOpen}
    onToggle={(e) => onToggle(e.currentTarget.open)}
  >
    <summary
      className="nhsuk-details__summary"
      onClick={(e) => {
        e.preventDefault()
        onToggle(!isOpen)
      }}
    >
      <span
        className="nhsuk-details__summary-text"
        data-testid={`see-${title.replace(/ cookies/i, "").toLowerCase()}-cookies`}
      >
        {CookieStrings.detailsSummaryText(title)}
      </span>
    </summary>
    <div className="nhsuk-details__text">
      <table
        className="nhsuk-table-responsive"
        data-testid={title === "Essential cookies" ? "essential-cookies-table" : "analytics-cookies-table"}
      >
        <caption className="nhsuk-table__caption nhsuk-u-visually-hidden">
          {title}
        </caption>
        <thead className="nhsuk-table__head">
          <tr>
            <th scope="col">{CookieStrings.cookieName}</th>
            <th scope="col">{CookieStrings.cookiePurpose}</th>
            <th scope="col">{CookieStrings.cookieExpiry}</th>
          </tr>
        </thead>
        <tbody className="nhsuk-table__body">
          {cookies.map((cookie, index) => (
            <tr key={index} className="nhsuk-table__row">
              <td className="nhsuk-table__cell">
                <span className="nhsuk-table-responsive__heading" aria-hidden="true">
                  {CookieStrings.cookieName}
                </span>
                {cookie.name}
              </td>
              <td className="nhsuk-table__cell">
                <span className="nhsuk-table-responsive__heading" aria-hidden="true">
                  {CookieStrings.cookiePurpose}
                </span>
                {cookie.purpose}
              </td>
              <td className="nhsuk-table__cell">
                <span className="nhsuk-table-responsive__heading" aria-hidden="true">
                  {CookieStrings.cookieExpiry}
                </span>
                {cookie.expiry}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  </details>
)

export default CookieTable
