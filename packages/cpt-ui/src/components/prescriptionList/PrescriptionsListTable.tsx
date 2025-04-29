import React, {useEffect, useState} from "react"
import {Tag} from "nhsuk-react-components"
import "../../styles/PrescriptionTable.scss"
import EpsSpinner from "@/components/EpsSpinner"
import {PrescriptionSummary} from "@cpt-ui-common/common-types/src"
import {PrescriptionsListStrings} from "../../constants/ui-strings/PrescriptionListTabStrings"
import {getStatusTagColour, getStatusDisplayText} from "@/helpers/statusMetadata"

export interface PrescriptionsListTableProps {
  textContent: PrescriptionsListStrings
  prescriptions: Array<PrescriptionSummary>
}

const PrescriptionsListTable = ({textContent, prescriptions}: PrescriptionsListTableProps) => {
  const [sortConfig, setSortConfig] = useState({
    key: "issueDate",
    direction: "descending"
  })
  const [activeHeader, setActiveHeader] = useState(sortConfig.key)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const headings = [
    {key: "issueDate", label: "Issue date"},
    {key: "prescriptionTreatmentType", label: "Prescription type"},
    {key: "statusCode", label: "Status"},
    {key: "cancellationWarning", label: "Pending cancellation"},
    {key: "prescriptionId", label: "Prescription ID"}
  ]

  // this functionality is also performed at getPrescriptionTypeDisplayText in "@/helpers/statusMetadata"
  //however we do not currently have instanceNumber or maxRepeats to make it work fully here
  const getPrescriptionTypeDisplayText = (prescriptionType: string): string => {
    switch (prescriptionType) {
      case "0001": return "Acute"
      case "0002": return "Repeat Y of X"
      case "0003": return "eRD Y of X"
      default: return "Unknown"
    }
  }

  const formatDate = (date: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
    return new Date(date).toLocaleDateString("en-GB", options).replace(/ /g, "-")
  }

  const requestSort = (key: string) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "ascending"
        ? "descending"
        : "ascending"
    setSortConfig({key, direction})
    setActiveHeader(key)
  }

  const renderSortIcons = (key: string) => {
    const isActive = sortConfig.key === key
    const direction = sortConfig.direction

    return (
      <span className="eps-prescription-table-sort-icon-wrapper-container">
        <span className="eps-prescription-table-sort-icon-wrapper">
          <span
            className={`arrow up-arrow ${
              isActive && direction !== "ascending" ? "hidden-arrow" : isActive ? "selected-arrow" : ""
            }`}
            aria-label="Sort ascending"
          >
            ▲
          </span>
          <span
            className={`arrow down-arrow ${
              isActive && direction !== "descending" ? "hidden-arrow" : isActive ? "selected-arrow" : ""
            }`}
            aria-label="Sort descending"
          >
            ▼
          </span>
        </span>
      </span>
    )
  }

  const formatPrescriptionStatus = () => {
    return prescriptions.map((prescription) => ({
      ...prescription,
      statusLabel: getStatusDisplayText(prescription.statusCode)
    }))
  }

  const getSortedItems = () => {
    const sorted = [...formatPrescriptionStatus()]

    sorted.sort((a, b) => {

      if (sortConfig.key === "cancellationWarning") {
        const aHasWarning = a.prescriptionPendingCancellation || a.itemsPendingCancellation
        const bHasWarning = b.prescriptionPendingCancellation || b.itemsPendingCancellation

        if (aHasWarning === bHasWarning) return 0
        if (sortConfig.direction === "ascending") {
          return aHasWarning ? 1 : -1
        } else {
          return aHasWarning ? -1 : 1
        }
      }

      const key = sortConfig.key as keyof typeof sorted[0]
      if (a[key]! < b[key]!) return sortConfig.direction === "ascending" ? -1 : 1
      if (a[key]! > b[key]!) return sortConfig.direction === "ascending" ? 1 : -1
      return 0
    })

    return sorted
  }

  if (loading) {
    return (
      <div className="eps-prescription-loading-modal" data-testid="eps-loading-spinner">
        <EpsSpinner />
      </div>
    )
  }

  if (prescriptions.length === 0) {
    return <p className="nhsuk-body">{textContent.noPrescriptionsMessage}</p>
  }

  //this is partially declared here to address linting errors for the line being too long.
  // The url is formed in the render below
  const prescriptionLink = "/site/prescription-details?prescriptionId="

  const renderTableDescription = () => {
    switch (textContent.testid) {
      case "current":
        return (
          <caption className="nhsuk-u-visually-hidden">
            A sortable table showing current prescriptions matching the search criteria.
            Column one shows the date the prescription was issued. Columns two and three
            show the type and status of the prescription. Column four shows whether the
            prescription is pending cancellation. Column five shows the prescription ID
            and has a link to view the details of the prescription.
          </caption>
        )
      case "future":
        return (
          <caption className="nhsuk-u-visually-hidden">
            A sortable table showing future-dated prescriptions matching the search criteria.
            Column one shows the date the prescription was issued. Columns two and three
            show the type and status of the prescription. Column four shows whether the
            prescription is pending cancellation. Column five shows the prescription ID
            and has a link to view the details of the prescription.
          </caption>
        )
      case "claimedExpired":
        return (
          <caption className="nhsuk-u-visually-hidden">
            A sortable table showing claimed and expired prescriptions matching the search criteria.
            Column one shows the date the prescription was issued. Columns two and three
            show the type and status of the prescription. Column four shows whether the
            prescription is pending cancellation. Column five shows the prescription ID
            and has a link to view the details of the prescription.
          </caption>
        )
    }
  }

  return (
    <div className="eps-prescription-table-container" data-testid="eps-prescription-table-container">
      <table
        className="eps-prescription-table"
        data-testid={`${textContent.testid}-prescriptions-results-table`}
      >
        {renderTableDescription()}
        <thead>
          <tr>
            {headings.map((heading) => (
              <th
                key={heading.key}
                role="columnheader"
                // onClick={() => requestSort(heading.key)}
                aria-sort={
                  sortConfig.key === heading.key
                    ? (sortConfig.direction as "ascending" | "descending" | "none" | "other")
                    : "none"
                }
                className={activeHeader === heading.key ? "active-header" : ""}
                data-testid={`eps-prescription-table-header-${heading.key}`}
              >
                <span
                  role="button"
                  tabIndex={0}
                  className={`eps-prescription-table-sort-text ${heading.key} 
                  ${activeHeader === heading.key ? "active-header" : ""}`}
                  onClick={() => requestSort(heading.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      requestSort(heading.key)
                    }
                  }}
                  aria-label={`
                    Sort by ${heading.label} 
                    ${sortConfig.key === heading.key && sortConfig.direction === "ascending"
                ? "descending"
                : "ascending"}
                  `}
                  data-testid={`eps-prescription-table-sort-${heading.key}`}
                >
                  <span className="sort-label-text">{heading.label}</span>
                  <span className="nhsuk-u-visually-hidden">, button</span>
                  {renderSortIcons(heading.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {getSortedItems().map((row, index) => (
            <tr
              key={index} className="eps-prescription-table-sort-button"
              data-testid="eps-prescription-table-sort-button">
              {headings.map(({key}) => {
                if (key === "issueDate") {
                  return (
                    <td key={key} className="eps-prescription-table-rows nowrap-cell" data-testid="issue-date-column">
                      <div>{formatDate(row.issueDate)}</div>
                    </td>
                  )
                }

                if (key === "prescriptionTreatmentType") {
                  return (
                    <td key={key} className="eps-prescription-table-rows" data-testid="prescription-type-column">
                      <div>{getPrescriptionTypeDisplayText(row.prescriptionTreatmentType)}</div>
                    </td>
                  )
                }

                if (key === "statusCode") {
                  return (
                    <td key={key} className="eps-prescription-table-rows" data-testid="status-code-column">
                      <Tag color={getStatusTagColour(row.statusCode)}>
                        {row.statusLabel}
                      </Tag>
                    </td>
                  )
                }

                if (key === "cancellationWarning") {
                  const showWarning =
                    row.prescriptionPendingCancellation || row.itemsPendingCancellation
                  return (
                    <td
                      key={key}
                      className="eps-prescription-table-rows narrow-cancellation-column"
                      data-testid="cancellation-warning-column"
                    >
                      {showWarning ? (
                        <span>
                          <span aria-hidden="true" role="img" className="warning-icon">⚠️</span>
                          <span className="nhsuk-u-visually-hidden">Warning: </span>
                          One or more items pending cancellation
                        </span>
                      ) : (
                        "None"
                      )}
                    </td>
                  )
                }

                if (key === "prescriptionId") {
                  return (
                    <td key={key} className="eps-prescription-table-rows" data-testid="prescription-id-column">
                      <div className="eps-prescription-id">{row.prescriptionId}</div>
                      <div>
                        <a
                          href={prescriptionLink + row.prescriptionId}
                          className="nhsuk-link"
                          data-testid={`view-prescription-link-${row.prescriptionId}`}
                        >
                          View prescription
                        </a>
                      </div>
                    </td>
                  )
                }

                return null
              })}
            </tr>
          ))}
          <tr>
            <td
              colSpan={headings.length}
              className="eps-prescription-table-summary-row"
              aria-live="polite"
              aria-label={`Showing ${prescriptions.length} of ${prescriptions.length} prescriptions`}
              data-testid="table-summary-row"
            >
              Showing {prescriptions.length} of {prescriptions.length}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default PrescriptionsListTable
