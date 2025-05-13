import React, {useEffect, useState} from "react"
import {Tag} from "nhsuk-react-components"
import "../../styles/PrescriptionTable.scss"
import EpsSpinner from "@/components/EpsSpinner"
import {PrescriptionSummary} from "@cpt-ui-common/common-types/src"
import {PrescriptionsListStrings} from "../../constants/ui-strings/PrescriptionListTabStrings"
import {getStatusTagColour, getStatusDisplayText} from "@/helpers/statusMetadata"
import {PRESCRIPTION_LIST_TABLE_TEXT} from "@/constants/ui-strings/PrescriptionListTableStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

export interface PrescriptionsListTableProps {
  textContent: PrescriptionsListStrings
  prescriptions: Array<PrescriptionSummary>
}

const PrescriptionsListTable = ({textContent, prescriptions}: PrescriptionsListTableProps) => {
  const [sortConfig, setSortConfig] = useState({
    key: "issueDate",
    direction: "descending"
  })
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
      case "0001": return PRESCRIPTION_LIST_TABLE_TEXT.typeDisplayText.acute
      case "0002": return PRESCRIPTION_LIST_TABLE_TEXT.typeDisplayText.repeat
      case "0003": return PRESCRIPTION_LIST_TABLE_TEXT.typeDisplayText.erd
      default: return PRESCRIPTION_LIST_TABLE_TEXT.typeDisplayText.unknown
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
            aria-label={PRESCRIPTION_LIST_TABLE_TEXT.sortAscending}
          >
            ▲
          </span>
          <span
            className={`arrow down-arrow ${
              isActive && direction !== "descending" ? "hidden-arrow" : isActive ? "selected-arrow" : ""
            }`}
            aria-label={PRESCRIPTION_LIST_TABLE_TEXT.sortDescending}
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

  const renderTableDescription = () => {
    const {testid} = textContent

    const intro = PRESCRIPTION_LIST_TABLE_TEXT.caption[testid as keyof typeof PRESCRIPTION_LIST_TABLE_TEXT.caption]
    const sharedText = PRESCRIPTION_LIST_TABLE_TEXT.caption.sharedText

    return (
      <caption className="nhsuk-u-visually-hidden">
        {intro} {sharedText}
      </caption>
    )
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
                aria-sort={
                  sortConfig.key === heading.key
                    ? (sortConfig.direction as "ascending" | "descending" | "none" | "other")
                    : "none"
                }
                className={sortConfig.key === heading.key ? "active-header" : ""}
                data-testid={`eps-prescription-table-header-${heading.key}`}
                onClick={() => requestSort(heading.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    requestSort(heading.key)
                  }
                }}
              >
                <span
                  role="button"
                  tabIndex={0}
                  className={`eps-prescription-table-sort-text ${heading.key} 
                  ${sortConfig.key === heading.key ? "active-header" : ""}`}
                  aria-label={`
                    ${PRESCRIPTION_LIST_TABLE_TEXT.sortBy} ${heading.label} 
                    ${sortConfig.key === heading.key && sortConfig.direction === "ascending"
                ? "descending"
                : "ascending"}
                  `}
                  data-testid={`eps-prescription-table-sort-${heading.key}`}
                >
                  <span className="sort-label-text">{heading.label}</span>
                  <span className="nhsuk-u-visually-hidden">{PRESCRIPTION_LIST_TABLE_TEXT.button}</span>
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
                          <span
                            aria-hidden="true"
                            role="img" className="warning-icon"
                            aria-label={PRESCRIPTION_LIST_TABLE_TEXT.warning}>⚠️</span>
                          {PRESCRIPTION_LIST_TABLE_TEXT.pendingCancellationItems}
                        </span>
                      ) : (
                        PRESCRIPTION_LIST_TABLE_TEXT.none
                      )}
                    </td>
                  )
                }

                if (key === "prescriptionId") {
                  return (
                    <td key={key} className="eps-prescription-table-rows">
                      <div className="eps-prescription-id">{row.prescriptionId}</div>
                      <div>
                        <a
                          href={`${FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE}?prescriptionId=${row.prescriptionId}`}
                          className="nhsuk-link"
                          data-testid={`view-prescription-link-${row.prescriptionId}`}
                        >
                          {PRESCRIPTION_LIST_TABLE_TEXT.viewPrescription}
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
              aria-label={`Showing ${prescriptions.length} of ${prescriptions.length}`}
              data-testid="table-summary-row"
            >
              {PRESCRIPTION_LIST_TABLE_TEXT.showing} {prescriptions.length} {" "}
              {PRESCRIPTION_LIST_TABLE_TEXT.of} {prescriptions.length}

            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default PrescriptionsListTable
