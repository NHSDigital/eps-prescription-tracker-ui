import {
  Card,
  Col,
  Tag,
  SummaryList
} from "nhsuk-react-components"
import {ItemDetails} from "@cpt-ui-common/common-types"
import {getItemStatusTagColour, getItemStatusDisplayText} from "@/helpers/statusMetadata"
import {STRINGS} from "@/constants/ui-strings/PrescribedDispensedItemsCardsStrings"
import {SummaryListRow} from "@/components/prescriptionDetails/ItemsCards/SummaryListRow"
import {CANCELLATION_REASON_MAP, NON_DISPENSING_REASON_MAP} from "@/constants/ui-strings/StatusReasonStrings"
import "../../styles/summarylist.scss"

interface ItemsProps {
  readonly items: Array<ItemDetails>
}

// Reusable component for rendering both prescribed and dispensed item cards
export function ItemsCards({items}: ItemsProps) {

  const renderCard = (
    item: ItemDetails,
    index: number
  ) => {
    const {
      medicationName,
      quantity,
      dosageInstructions,
      epsStatusCode,
      pharmacyStatus,
      itemPendingCancellation,
      cancellationReason,
      notDispensedReason
    } = item

    return (
      <div key={`item-${index}`} className="data-panel__wrapper no-outline" tabIndex={-1}>
        <Card className="nhsuk-u-margin-bottom-3" style={{boxShadow: "none"}}>
          <Card.Content className="nhsuk-u-padding-top-3 nhsuk-u-padding-bottom-1
                                 nhsuk-u-padding-right-3 nhsuk-u-padding-left-3">
            <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
              <span>{`${index + 1}. ${medicationName}`}</span>
            </Card.Heading>

            {/* Display EPS status as NHS Tag */}
            <p className="nhsuk-u-margin-bottom-2" data-testid="eps-status-tag">
              <Tag color={getItemStatusTagColour(epsStatusCode)}>
                {getItemStatusDisplayText(epsStatusCode)}
              </Tag>
            </p>

            {/* Cancellation warning if applicable */}
            {itemPendingCancellation && (
              <p className="nhsuk-u-margin-bottom-2" data-testid="cancellation-warning">
                <span role="img" aria-label="Warning">⚠️</span> {STRINGS.PENDING_CANCELLATION}
              </p>
            )}

            <SummaryList className="nhsuk-u-margin-bottom-2" data-testid="prescription-summary-list">
              {cancellationReason && (
                <SummaryListRow
                  label={STRINGS.CANCELLATION_REASON}
                  value={CANCELLATION_REASON_MAP[cancellationReason]}
                />
              )}

              {notDispensedReason && (
                <SummaryListRow
                  label={STRINGS.NOT_DISPENSED_REASON}
                  value={NON_DISPENSING_REASON_MAP[notDispensedReason]}
                />
              )}

              <SummaryListRow label={STRINGS.QUANTITY_LABEL} value={quantity}/>

              {dosageInstructions && (
                <SummaryListRow label={STRINGS.INSTRUCTIONS_LABEL} value={dosageInstructions}/>
              )}
              {pharmacyStatus && (
                <SummaryListRow
                  label={STRINGS.PHARMACY_STATUS_LABEL}
                  tagValue={pharmacyStatus}
                />
              )}
            </SummaryList>
          </Card.Content>
        </Card>
      </div>
    )
  }

  return (
    <Col width="one-third">
      <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">
        {STRINGS.ITEMS_HEADER}
      </h2>
      {items.map(renderCard)}
    </Col>
  )
}
