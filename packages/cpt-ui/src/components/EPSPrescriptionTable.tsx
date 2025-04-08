import React, {useState} from "react"
import {Tag} from "nhsuk-react-components"
import "../styles/EPSPrescriptionTable.scss"

interface Prescription {
        issueDate: string
        prescriptionType: string
        status: string
        pendingCancellation: string
        prescriptionId: string
}
export const EPSPrescriptionTable = () => {

  const [sortConfig, setSortConfig] = useState({
    key: "issueDate",
    direction: "ascending"
  })
  const [activeHeader, setActiveHeader] = useState(sortConfig.key)

  const data: Array<Prescription> = [
    {
      issueDate: "22-Jan-2025",
      prescriptionType: "eRD 3 of 6",
      status: "Next repeat ready to download",
      pendingCancellation: "No",
      prescriptionId: "6GA337-P34302-2H597C"
    },
    {
      issueDate: "22-Jan-2025",
      prescriptionType: "eRD 4 of 6",
      status: "Future eRD issue",
      pendingCancellation: "Yes",
      prescriptionId: "6GA337-P34302-2H597C"
    },
    {
      issueDate: "22-Jan-2025",
      prescriptionType: "eRD 5 of 6",
      status: "Future eRD issue",
      pendingCancellation: "No",
      prescriptionId: "6GA337-P34302-2H597C"
    }
  ]

  const headings = [
    {key: "issueDate", label: "Issue date"},
    {key: "prescriptionType", label: "Prescription type"},
    {key: "status", label: "Status"},
    {key: "pendingCancellation", label: "Pending cancellation"},
    {key: "prescriptionId", label: "Prescription ID"}
  ]

  const getStatusTagColour = (status: string) => {
    switch (status) {
      case "Next repeat ready to download":
        return "orange"
      case "Available to download":
        return "yellow"
      case "Downloaded by a dispenser":
        return "purple"
      case "Some items dispensed":
        return "blue"
      case "Expired":
        return "white"
      case "Cancelled":
        return "red"
      case "All items dispensed":
        return "green"
      case "Not dispensed":
        return "red"
      case "Claimed":
        return "grey"
      case "Not claimed":
        return "pink"
      case "Future eRD issue":
        return "aqua-green"
      case "Future issue date dispense":
        return "blue"
      case "Future prescription cancelled":
        return "red"
      default:
        return "red"
    }
  }

  //   const getLineItemStatusTagColour = (status) => {
  //     switch (status) {
  //       case "Item fully dispensed":
  //         return "green"
  //       case "Item not dispensed":
  //         return "orange"
  //       case "Item dispensed - partial":
  //         return "blue"
  //       case "Item not dispensed - owing":
  //         return "blue"
  //       case "Item cancelled":
  //         return "red"
  //       case "Item expired":
  //         return "white"
  //       case "Item to be dispensed":
  //         return "yellow"
  //       case "Item with dispenser":
  //         return "purple"
  //       default:
  //         return ""
  //     }
  //   }

  const requestSort = (key: string) => {
    let direction = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({key, direction})
    setActiveHeader(key)
  }

  const getSortedItems = () => {
    const sortedItems = [...data]
    sortedItems.sort((a, b) => {
      const key = sortConfig.key as keyof Prescription
      if (a[key] < b[key]) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (a[key] > b[key]) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
    return sortedItems
  }

  const renderSortIcons = (key: string) => {
    if (sortConfig.key === key) {
      return (
        <span className="eps-prescription-table-sort-icon-wrapper">
          {sortConfig.direction === "ascending" ? "▲" : "▼"}
        </span>
      )
    }
    return (
      <span className="eps-prescription-table-sort-icon-wrapper">
        <span>▲</span>
        <span>▼</span>
      </span>
    )
  }

  return (
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
                <span className="eps-prescription-table-sort-text">
                  {heading.label} {renderSortIcons(heading.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {getSortedItems().map((row, index) => (
            <tr key={index} className="eps-prescription-table-sort-button">
              {headings.map((heading) => (
                <td key={heading.key} className="eps-prescription-table-rows">
                  {heading.key === "status" ? (
                    <Tag color={getStatusTagColour(row.status)}>
                      {row.status}
                    </Tag>
                  ) : (
                    row[heading.key as keyof Prescription]
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr className="eps-prescription-table-sort-button"> Showing 2 of 2</tr>
        </tbody>
      </table>
    </div>
  )
}
