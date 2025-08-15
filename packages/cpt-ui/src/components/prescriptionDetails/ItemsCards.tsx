import {
  Card,
  Col,
  Tag,
  SummaryList
} from "nhsuk-react-components"
import {ItemDetails} from "@cpt-ui-common/common-types"
import {getItemStatusTagColour, getItemStatusDisplayText} from "@/helpers/statusMetadata"
import {STRINGS} from "@/constants/ui-strings/PrescribedDispensedItemsCardsStrings"

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
      cancellationReason
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
            {epsStatusCode && (
              <p className="nhsuk-u-margin-bottom-2" data-testid="eps-status-tag">
                <Tag color={getItemStatusTagColour(epsStatusCode)}>
                  {getItemStatusDisplayText(epsStatusCode)}
                </Tag>
              </p>
            )}

            {/* Cancellation warning if applicable */}
            {itemPendingCancellation && (
              <p className="nhsuk-u-margin-bottom-2" data-testid="cancellation-warning">
                <span role="img" aria-label="Warning">⚠️</span> {STRINGS.CANCELLATION_REASON_MESSAGE}
              </p>
            )}

            <SummaryList className="nhsuk-u-margin-bottom-2" data-testid="prescription-summary-list">
              {/* Optional cancellation reason */}
              {cancellationReason && (
                <SummaryList.Row>
                  <SummaryList.Key>{STRINGS.CANCELLATION_REASON}</SummaryList.Key>
                  <SummaryList.Value>
                    <span className="data-field__content data-field__content--address">
                      {cancellationReason}
                    </span>
                  </SummaryList.Value>
                </SummaryList.Row>
              )}

              {/* Quantity */}
              <SummaryList.Row>
                <SummaryList.Key>{STRINGS.QUANTITY_LABEL}</SummaryList.Key>
                <SummaryList.Value>
                  <span className="data-field__content data-field__content--address">
                    {quantity}
                  </span>
                </SummaryList.Value>
              </SummaryList.Row>

              {/* Dosage instructions */}
              {dosageInstructions !== "Unknown" && (
                <SummaryList.Row>
                  <SummaryList.Key>{STRINGS.INSTRUCTIONS_LABEL}</SummaryList.Key>
                  <SummaryList.Value>
                    <span className="data-field__content data-field__content--address">
                      {dosageInstructions}
                    </span>
                  </SummaryList.Value>
                </SummaryList.Row>
              )}

              {/* Optional pharmacy status */}
              {pharmacyStatus && (
                <SummaryList.Row>
                  <SummaryList.Key>{STRINGS.PHARMACY_STATUS_LABEL}</SummaryList.Key>
                  <SummaryList.Value>
                    <span className="data-field__content data-field__content--address">
                      <Tag>{pharmacyStatus}</Tag>
                    </span>
                  </SummaryList.Value>
                </SummaryList.Row>
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
