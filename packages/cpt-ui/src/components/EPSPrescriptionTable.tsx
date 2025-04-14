import React, {useState, useEffect} from "react"
import {Tag} from "nhsuk-react-components"
import "../styles/EPSPrescriptionTable.scss"
import EpsSpinner from "@/components/EpsSpinner"
import {PrescriptionSummary} from "@cpt-ui-common/common-types/src"

interface EPSPrescriptionTableProps {
  currentPrescriptions: Array<PrescriptionSummary>,
  pastPrescriptions: Array<PrescriptionSummary>,
  futurePrescriptions: Array<PrescriptionSummary>,
  prescriptionCount: number,
  activeTab: "current" | "past" | "future",
}

export const EPSPrescriptionTable = ({
  currentPrescriptions,
  pastPrescriptions,
  futurePrescriptions,
  activeTab
}: EPSPrescriptionTableProps) => {

  const [sortConfig, setSortConfig] = useState({
    key: "issueDate",
    direction: "descending"
  })
  const [activeHeader, setActiveHeader] = useState(sortConfig.key)
  const [loading, setLoading] = useState(true)

  //This is just to demo the loading timer while we are using dummy data, set to spin for 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const getActiveTabPrescriptions = () => {
    switch (activeTab) {
      case "current":
        return currentPrescriptions
      case "past":
        return pastPrescriptions
      case "future":
        return futurePrescriptions
      default:
        return []
    }
  }

  const activePrescriptions = getActiveTabPrescriptions()

  const headings = [
    {key: "issueDate", label: "Issue date"},
    {key: "prescriptionTreatmentType", label: "Prescription type"},
    {key: "statusCode", label: "Status"},
    {key: "cancellationWarning", label: "Pending Cancellation"},
    {key: "prescriptionId", label: "Prescription ID"}
  ]
  type TagColour =
  | "red"
  | "yellow"
  | "purple"
  | "blue"
  | "white"
  | "green"
  | "grey"
  | "pink"
  | "aqua-green"
  | "orange"

  const getStatusTagColour = (statusCode: string): TagColour => {
    switch (statusCode) {
      case "0000":
        return "orange"
      case "0001":
        return "yellow"
      case "0002":
        return "purple"
      case "0003":
        return "blue"
      case "0004":
        return "white"
      case "0005":
        return "red"
      case "0006":
        return "green"
      case "0007":
        return "red"
      case "0008":
        return "grey"
      case "0009":
        return "pink"
      case "9000":
        return "aqua-green"
      case "9001":
        return "blue"
      case "9005":
        return "red"
      default:
        return "red"
    }
  }

  const getStatusDisplayText = (statusCode: string): string => {
    switch (statusCode) {
      case "0001":
        return "Available to download"
      case "0002":
        return "Downloaded by a dispenser"
      case "0003":
        return "Some items dispensed"
      case "0004":
        return "Expired"
      case "0005":
        return "Cancelled"
      case "0006":
        return "All items dispensed"
      case "0007":
        return "Not dispensed"
      case "0008":
        return "Claimed"
      case "0009":
        return "Not claimed"
      case "9000":
        return "Future eRD issue"
      case "9001":
        return "Future issue date dispense"
      case "9005":
        return "Future prescription cancelled"
      default:
        return "Unknown"
    }
  }

  //logic will need to change here with live data to update X and Y
  const getPrescriptionTypeDisplayText = (prescriptionType: string): string => {
    switch(prescriptionType) {
      case "0001":
        return "Acute"
      case "0002":
        return "Repeat (Y of X)"
      case "0003":
        return "eRD (Y of X)"
      default:
        return "Unknown"
    }

  }

  const requestSort = (key: string) => {
    let direction = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({key, direction})
    setActiveHeader(key)
  }

  //status codes need to be mapped before being inserted into the table so ordering is correct
  const formatPrescriptionStatus = () => {
    return getActiveTabPrescriptions().map((prescription) => ({
      ...prescription,
      statusLabel: getStatusDisplayText(prescription.statusCode)
    }))
  }

  const getSortedItems = () => {
    const sortedItems = [...formatPrescriptionStatus()]
    const key = sortConfig.key as keyof typeof sortedItems[0]

    sortedItems.sort((a, b) => {
      if (a[key]! < b[key]!) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (a[key]! > b[key]!) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })

    return sortedItems
  }

  const renderSortIcons = (key: string) => {
    const isActive = sortConfig.key === key
    const direction = sortConfig.direction

    return (
      <span className="eps-prescription-table-sort-icon-wrapper">
        <span
          className={`arrow up-arrow ${
            isActive && direction !== "ascending" ? "hidden-arrow" : ""
          }`}
        >
          ▲
        </span>
        <span
          className={`arrow down-arrow ${
            isActive && direction !== "descending" ? "hidden-arrow" : ""
          }`}
        >
          ▼
        </span>
      </span>
    )
  }

  const getNoResultsMessage = () => {
    switch (activeTab) {
      case "current":
        return "No current prescriptions found."
      case "past":
        return "No claimed or expired prescriptions found."
      case "future":
        return "No future dated prescriptions found."
    }
  }

  const checkPrescriptionsForActiveTab = (activeTab: string) => {
    if (activeTab === "current") return currentPrescriptions
    if (activeTab === "past") return pastPrescriptions
    if (activeTab === "future") return futurePrescriptions
  }

  const formatDate = (date: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }

    const formattedDate = new Date(date).toLocaleDateString("en-GB", options)

    return formattedDate.replace(/ /g, "-")
  }

  if (loading) {
    return (
      <div className="eps-prescription-loading-modal" data-testid="eps-loading-spinner">
        <EpsSpinner />
      </div>
    )
  }

  return (
    checkPrescriptionsForActiveTab(activeTab)?.length === 0 ? (
      <p className="nhsuk-body">{getNoResultsMessage()}</p>
    ) :
      <div className="eps-prescription-table-container" data-testid="eps-prescription-table-container">
        <table className="eps-prescription-table">
          <thead>
            <tr>
              {headings.map((heading) => (
                <th
                  key={heading.key}
                  onClick={() => requestSort(heading.key)}
                  aria-sort={
                    sortConfig.key === heading.key
                      ? (sortConfig.direction as "ascending" | "descending" | "none" | "other")
                      : "none"
                  }
                  className={activeHeader === heading.key ? "active-header" : ""}
                >
                  <span className={`eps-prescription-table-sort-text ${heading.key}`}>
                    {heading.label} {renderSortIcons(heading.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getSortedItems().map((row, index) => (
              <tr key={index} className="eps-prescription-table-sort-button">
                {headings.map((heading) => {
                  const key = heading.key

                  if (key === "issueDate") {
                    return (
                      <td key={key} className="eps-prescription-table-rows nowrap-cell">
                        <div>
                          {formatDate(row.issueDate)}
                        </div>
                      </td>
                    )
                  }
                  if (key === "prescriptionTreatmentType"){
                    return (
                      <td key={key} className="eps-prescription-table-rows">
                        <div>
                          {getPrescriptionTypeDisplayText(row.prescriptionTreatmentType)}
                        </div>
                      </td>
                    )
                  }
                  if (key === "statusCode") {
                    return (
                      <td key={key} className="eps-prescription-table-rows">
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
                      <td key={key} className="eps-prescription-table-rows narrow-cancellation-column">
                        {showWarning ? "⚠️ One or more items pending cancellation" : "None"}
                      </td>
                    )
                  }
                  if (key === "prescriptionId") {
                    return (
                      <td key={key} className="eps-prescription-table-rows">
                        <div className="eps-prescription-id">{row.prescriptionId}</div>
                        <div>
                          <a
                            href="https://www.nhs.com"
                            className="nhsuk-link"
                          >
                            View Prescription
                          </a>
                        </div>
                      </td>
                    )
                  }
                })}
              </tr>
            ))}
            <tr>
              <td colSpan={headings.length} className="eps-prescription-table-summary-row">
                Showing {activePrescriptions.length} of {activePrescriptions.length}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  )
}
