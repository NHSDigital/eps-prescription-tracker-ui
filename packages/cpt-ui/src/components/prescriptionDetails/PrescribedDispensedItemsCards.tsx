import {
  Card,
  Col,
  Tag,
  Details,
  SummaryList
} from "nhsuk-react-components"
import {DispensedItem, PrescribedItem} from "@cpt-ui-common/common-types/src/prescriptionDetails"
import {getItemStatusTagColour, getItemStatusDisplayText} from "@/helpers/statusMetadata"
import {STRINGS} from "@/constants/ui-strings/PrescribedDispensedItemsCardsStrings"

interface PrescribedDispensedItemsProps {
  prescribedItems: Array<PrescribedItem>
  dispensedItems: Array<DispensedItem>
}

// Reusable component for rendering both prescribed and dispensed item cards
export function PrescribedDispensedItemsCards({
  prescribedItems,
  dispensedItems
}: PrescribedDispensedItemsProps) {

  // Utility to determine if an item is a DispensedItem (and not just PrescribedItem)
  // This enables us to access 'initiallyPrescribed' property safely
  const isDispensedItem = (itm: DispensedItem | PrescribedItem): itm is DispensedItem =>
    "initiallyPrescribed" in itm.itemDetails

  const renderCard = (
    item: DispensedItem | PrescribedItem,
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
    } = item.itemDetails

    // Check if we should render the "Initially Prescribed" expandable section
    const hasInitial = isDispensedItem(item) && item.itemDetails.initiallyPrescribed

    return (
      <div key={`item-${index}`} className="data-panel__wrapper no-outline" tabIndex={-1}>
        <Card className="nhsuk-u-margin-bottom-3" style={{boxShadow: "none"}}>
          <Card.Content className="nhsuk-u-padding-top-3 nhsuk-u-padding-bottom-1
                                   nhsuk-u-padding-right-3 nhsuk-u-padding-left-3">
            <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
              <span>{medicationName}</span>
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
              <SummaryList.Row>
                <SummaryList.Key>{STRINGS.INSTRUCTIONS_LABEL}</SummaryList.Key>
                <SummaryList.Value>
                  <span className="data-field__content data-field__content--address">
                    {dosageInstructions}
                  </span>
                </SummaryList.Value>
              </SummaryList.Row>

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

            {/* Expandable details for initially prescribed info, only for dispensed items */}
            {hasInitial && (
              <Details data-testid="initial-prescription-details">
                <Details.Summary>{STRINGS.INITIALLY_PRESCRIBED_DETAILS}</Details.Summary>
                <Details.Text>
                  <SummaryList data-testid="initial-prescription-summary-list">
                    <SummaryList.Row>
                      <SummaryList.Key>{STRINGS.INITIALLY_PRESCRIBED_ITEM}</SummaryList.Key>
                      <SummaryList.Value>{item.itemDetails.initiallyPrescribed!.medicationName}</SummaryList.Value>
                    </SummaryList.Row>
                    <SummaryList.Row>
                      <SummaryList.Key>{STRINGS.INITIALLY_PRESCRIBED_QUANTITY}</SummaryList.Key>
                      <SummaryList.Value>{item.itemDetails.initiallyPrescribed!.quantity}</SummaryList.Value>
                    </SummaryList.Row>
                    <SummaryList.Row>
                      <SummaryList.Key>{STRINGS.INITIALLY_PRESCRIBED_INSTRUCTION}</SummaryList.Key>
                      <SummaryList.Value>{item.itemDetails.initiallyPrescribed!.dosageInstructions}</SummaryList.Value>
                    </SummaryList.Row>
                  </SummaryList>
                </Details.Text>
              </Details>
            )}
          </Card.Content>
        </Card>
      </div>
    )
  }

  return (
    <Col width="one-third">
      {/* Dispensed Section */}
      {dispensedItems.length > 0 && (
        <>
          <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">
            {STRINGS.DISPENSED_ITEMS_HEADER}
          </h2>
          {dispensedItems.map(renderCard)}
        </>
      )}
      {/* Prescribed Section */}
      {prescribedItems.length > 0 && (
        <>
          <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">
            {STRINGS.PRESCRIBED_ITEMS_HEADER}
          </h2>
          {prescribedItems.map(renderCard)}
        </>
      )}
    </Col>
  )
}
