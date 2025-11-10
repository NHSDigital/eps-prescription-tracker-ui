import React from "react"
import {Tag, Table} from "nhsuk-react-components"
import "../../styles/PrescriptionTable.scss"
import {PrescriptionSummary} from "@cpt-ui-common/common-types/src"
import {PrescriptionsListStrings} from "../../constants/ui-strings/PrescriptionListTabStrings"
import {getStatusTagColour, getStatusDisplayText, formatDateForPrescriptions} from "@/helpers/statusMetadata"
import {PRESCRIPTION_LIST_TABLE_TEXT} from "@/constants/ui-strings/PrescriptionListTableStrings"
import {Link} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {useSearchContext} from "@/context/SearchProvider"
import {useNavigationContext} from "@/context/NavigationProvider"

export interface PrescriptionsListTableProps {
  textContent: PrescriptionsListStrings;
  prescriptions: Array<PrescriptionSummary>;
}

type SortDirection = "ascending" | "descending";
type SortConfig = { key: string; direction: SortDirection | null };
type TabId = "current" | "future" | "claimed";

const PrescriptionsListTable = ({
  textContent,
  prescriptions: initialPrescriptions
}: PrescriptionsListTableProps) => {
  const initialSortConfig: SortConfig = {key: "issueDate", direction: null}
  const currentTabId: TabId = textContent.testid as TabId
  const searchContext = useSearchContext()
  const navigationContext = useNavigationContext()

  // all tabs have own key in state object so each tab can be sorted individually
  const [allSortConfigs, setAllSortConfigs] = React.useState<
    Record<TabId, SortConfig>
  >({
    current: initialSortConfig,
    future: initialSortConfig,
    claimed: initialSortConfig
  })

  const sortConfig = allSortConfigs[currentTabId] || initialSortConfig

  const setSortConfigForTab = (newConfig: SortConfig) => {
    setAllSortConfigs((prev) => ({
      ...prev,
      [currentTabId]: newConfig
    }))
  }

  const headings = [
    {key: "issueDate", label: "Issue date", width: "12%", headerId: "header-issue-date"},
    {key: "prescriptionTreatmentType", label: "Prescription type", width: "20%", headerId: "header-prescription-type"},
    {key: "statusCode", label: "Status", width: "18%", headerId: "header-status"},
    {key: "cancellationWarning", label: "Pending cancellation", width: "20%", headerId: "header-cancellation"},
    {key: "prescriptionId", label: "Prescription ID", width: "30%", headerId: "header-prescription-id"}
  ]

  const getPrescriptionTypeDisplayText = (
    prescriptionType: string,
    repeatIssue: number = 1,
    repeatMax?: number
  ): string => {
    switch (prescriptionType) {
      case "0001":
        return PRESCRIPTION_LIST_TABLE_TEXT.typeDisplayText.acute
      case "0002":
        return PRESCRIPTION_LIST_TABLE_TEXT.typeDisplayText.repeat
      case "0003":
        return PRESCRIPTION_LIST_TABLE_TEXT.typeDisplayText.erd
          .replace("Y", repeatIssue?.toString())
          .replace("X", repeatMax!.toString())
      default:
        return PRESCRIPTION_LIST_TABLE_TEXT.typeDisplayText.unknown
    }
  }

  const requestSort = (key: string) => {
    const direction: SortDirection =
      sortConfig.key === key && sortConfig.direction === "ascending"
        ? "descending"
        : "ascending"
    setSortConfigForTab({key, direction})
  }

  const renderSortIcons = (key: string) => {
    const isActive = sortConfig.key === key && sortConfig.direction !== null
    const direction = sortConfig.direction

    return (
      <span className="eps-prescription-table-sort-icon-wrapper-container">
        <span
          className="eps-prescription-table-sort-icon-wrapper"
          role="img"
          aria-label={PRESCRIPTION_LIST_TABLE_TEXT.sortLabel}
        >
          <span
            className={`arrow up-arrow ${
              isActive && direction !== "ascending"
                ? "hidden-arrow"
                : isActive
                  ? "selected-arrow"
                  : ""
            }`}
          >
            ▲
          </span>
          <span
            className={`arrow down-arrow ${
              isActive && direction !== "descending"
                ? "hidden-arrow"
                : isActive
                  ? "selected-arrow"
                  : ""
            }`}
          >
            ▼
          </span>
        </span>
      </span>
    )
  }

  const formatPrescriptionStatus = (items: Array<PrescriptionSummary>) => {
    return items.map((prescription) => ({
      ...prescription,
      statusLabel: getStatusDisplayText(prescription.statusCode)
    }))
  }

  const getValidDateTimestamp = (dateString: string): number => {
    const date = new Date(dateString)

    if (!isNaN(date.getTime())) {
      return date.getTime()
    }

    return Number.MIN_SAFE_INTEGER
  }

  const constructLink = (): string => {
    return `${FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE}`
  }

  const setSearchPrescriptionState = (
    prescriptionId: string,
    issueNumber: string | undefined
  ) => {
    const originalSearchParams =
      navigationContext.getOriginalSearchParameters()

    let relevantParams = {}
    if (originalSearchParams) {
      if (originalSearchParams.prescriptionId) {
        relevantParams =
          navigationContext.getRelevantSearchParameters("prescriptionId")
      } else if (originalSearchParams.nhsNumber) {
        relevantParams =
          navigationContext.getRelevantSearchParameters("nhsNumber")
      } else if (
        originalSearchParams.firstName ||
        originalSearchParams.lastName
      ) {
        relevantParams =
          navigationContext.getRelevantSearchParameters("basicDetails")
      }
    }

    // only preserve relevant search parameters and add prescription-specific ones
    searchContext.setAllSearchParameters({
      ...relevantParams,
      prescriptionId,
      issueNumber
    })
  }

  const getSortedItems = () => {
    const sorted = [...formatPrescriptionStatus(initialPrescriptions)]

    sorted.sort((a, b) => {
      if (sortConfig.key === "cancellationWarning") {
        const aHasWarning =
          a.prescriptionPendingCancellation || a.itemsPendingCancellation
        const bHasWarning =
          b.prescriptionPendingCancellation || b.itemsPendingCancellation

        if (aHasWarning === bHasWarning) {
          const aDateTimestamp = getValidDateTimestamp(a.issueDate)
          const bDateTimestamp = getValidDateTimestamp(b.issueDate)
          return bDateTimestamp - aDateTimestamp
        }

        if (sortConfig.direction === "ascending") {
          return aHasWarning ? 1 : -1
        } else {
          return aHasWarning ? -1 : 1
        }
      }

      if (
        sortConfig.key === "statusCode" &&
        a.statusCode === b.statusCode
      ) {
        const aDateTimestamp = getValidDateTimestamp(a.issueDate)
        const bDateTimestamp = getValidDateTimestamp(b.issueDate)
        return bDateTimestamp - aDateTimestamp
      }

      if (sortConfig.key === "issueDate") {
        const aDateTimestamp = getValidDateTimestamp(a.issueDate)
        const bDateTimestamp = getValidDateTimestamp(b.issueDate)
        return sortConfig.direction === "ascending"
          ? aDateTimestamp - bDateTimestamp
          : bDateTimestamp - aDateTimestamp
      }

      const key = sortConfig.key as keyof typeof sorted[0]
      if (a[key]! < b[key]!)
        return sortConfig.direction === "ascending" ? -1 : 1
      if (a[key]! > b[key]!)
        return sortConfig.direction === "ascending" ? 1 : -1

      const aDateTimestamp = getValidDateTimestamp(a.issueDate)
      const bDateTimestamp = getValidDateTimestamp(b.issueDate)
      return bDateTimestamp - aDateTimestamp
    })
    return sorted
  }

  if (initialPrescriptions.length === 0) {
    return <p className="nhsuk-body" data-testid="no-prescriptions-message">{textContent.noPrescriptionsMessage}</p>
  }

  const renderTableCaption = () => {
    const {testid} = textContent

    const intro =
      PRESCRIPTION_LIST_TABLE_TEXT.caption[
        testid as keyof typeof PRESCRIPTION_LIST_TABLE_TEXT.caption
      ]
    const sharedText = PRESCRIPTION_LIST_TABLE_TEXT.caption.sharedText

    return (
      <caption className="nhsuk-u-visually-hidden">
        {intro} {sharedText}
      </caption>
    )
  }

  const renderHeaderCell = (heading: typeof headings[0]) => (
    <Table.Cell
      as="th"
      scope="col"
      key={heading.key}
      id={heading.headerId}
      width={heading.width}
      aria-sort={
        sortConfig.key === heading.key
          ? (sortConfig.direction as "ascending" | "descending" | null) || "none"
          : "none"
      }
      data-testid={`eps-prescription-table-header-${heading.key}`}
    >
      <button
        type="button"
        tabIndex={0}
        className={`eps-prescription-table-sort-text ${heading.key}`}
        data-testid={`eps-prescription-table-sort-${heading.key}`}
        onClick={(e) => {
          e.preventDefault()
          requestSort(heading.key)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            requestSort(heading.key)
          }
        }}
      >
        {heading.label}
        {renderSortIcons(heading.key)}
      </button>
    </Table.Cell>
  )

  const renderDataCell = (row: PrescriptionSummary & { statusLabel: string }, key: string) => {
    const heading = headings.find(h => h.key === key)
    const headerId = heading?.headerId

    if (key === "issueDate") {
      return (
        <Table.Cell
          key={key}
          headers={headerId}
          className="eps-prescription-table-rows nowrap-cell"
          data-testid="issue-date-column"
        >
          <div>{formatDateForPrescriptions(row.issueDate)}</div>
        </Table.Cell>
      )
    }

    if (key === "prescriptionTreatmentType") {
      return (
        <Table.Cell
          key={key}
          headers={headerId}
          className="eps-prescription-table-rows prescription-type-cell"
          data-testid="prescription-type-column"
        >
          <div>
            {getPrescriptionTypeDisplayText(
              row.prescriptionTreatmentType,
              row.issueNumber,
              row.maxRepeats
            )}
          </div>
        </Table.Cell>
      )
    }

    if (key === "statusCode") {
      return (
        <Table.Cell
          key={key}
          headers={headerId}
          className="eps-prescription-table-rows"
          data-testid="status-code-column"
        >
          <Tag color={getStatusTagColour(row.statusCode)}>
            {row.statusLabel}
          </Tag>
        </Table.Cell>
      )
    }

    if (key === "cancellationWarning") {
      const showWarning =
        row.prescriptionPendingCancellation ||
        row.itemsPendingCancellation
      return (
        <Table.Cell
          key={key}
          headers={headerId}
          className="eps-prescription-table-rows narrow-cancellation-column"
          data-testid="cancellation-warning-column"
        >
          {showWarning ? (
            <span>
              <span
                aria-hidden="true"
                role="img"
                className="warning-icon"
                aria-label={PRESCRIPTION_LIST_TABLE_TEXT.warning}
              >
                ⚠️
              </span>
              {PRESCRIPTION_LIST_TABLE_TEXT.pendingCancellationItems}
            </span>
          ) : (
            PRESCRIPTION_LIST_TABLE_TEXT.none
          )}
        </Table.Cell>
      )
    }

    if (key === "prescriptionId") {
      return (
        <Table.Cell
          key={key}
          headers={headerId}
          className="eps-prescription-table-rows"
        >
          <div className="eps-prescription-id">
            {row.prescriptionId}
          </div>
          <div>
            {row.isDeleted ? (
              <span
                data-testid={`unavailable-text-${row.prescriptionId}`}
              >
                {PRESCRIPTION_LIST_TABLE_TEXT.unavailableText}
              </span>
            ) : (
              <Link
                to={constructLink()}
                className="nhsuk-link"
                data-testid={`view-prescription-link-${row.prescriptionId}`}
                onClick={() => setSearchPrescriptionState(row.prescriptionId, row.issueNumber?.toString())}
              >
                {PRESCRIPTION_LIST_TABLE_TEXT.viewPrescription}
              </Link>
            )}
          </div>
        </Table.Cell>
      )
    }

    return null
  }

  return (
    <div
      className="eps-prescription-table-container"
      data-testid="eps-prescription-table-container"
    >
      <Table
        className="eps-prescription-table"
        data-testid={`${textContent.testid}-prescriptions-results-table`}
      >
        {renderTableCaption()}

        <Table.Head>
          <Table.Row>
            {headings.map(renderHeaderCell)}
          </Table.Row>
        </Table.Head>

        <Table.Body>
          {getSortedItems().map((row) => {
            // creates unique key combining prescriptionId and issueNumber for ERD prescriptions
            const uniqueKey = `${row.prescriptionId}-${row.issueNumber ?? 1}`

            return (
              <Table.Row key={uniqueKey} data-testid="eps-prescription-table-row">
                {headings.map(({key}) => renderDataCell(row, key))}
              </Table.Row>
            )
          })}
        </Table.Body>

        <tfoot>
          <tr>
            <td
              colSpan={headings.length}
              className="eps-prescription-table-summary-row"
              aria-live="polite"
              data-testid="table-summary-row"
            >
              {PRESCRIPTION_LIST_TABLE_TEXT.showing} {initialPrescriptions.length}{" "}
              {PRESCRIPTION_LIST_TABLE_TEXT.of} {initialPrescriptions.length}
            </td>
          </tr>
        </tfoot>
      </Table>
    </div>
  )
}

export default PrescriptionsListTable
