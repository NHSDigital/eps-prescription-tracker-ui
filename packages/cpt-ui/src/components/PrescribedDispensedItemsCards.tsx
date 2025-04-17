import {
  Card,
  Col,
  Tag,
  Details,
  SummaryList
} from "nhsuk-react-components"
import {DispensedItem, PrescribedItem} from "@cpt-ui-common/common-types/src/prescriptionDetails"
import {getTagColourFromStatus} from "@/helpers/statusToTagColour"
import {STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

interface PrescribedDispensedItemsProps {
  prescribedItems: Array<PrescribedItem>
  dispensedItems: Array<DispensedItem>
}

export function PrescribedDispensedItemsCards({
  prescribedItems,
  dispensedItems
}: PrescribedDispensedItemsProps) {
  const renderCard = (
    item: DispensedItem | PrescribedItem,
    index: number
  ) => {
    const {
      medicationName,
      quantity,
      dosageInstructions,
      nhsAppStatus,
      pharmacyStatus,
      itemPendingCancellation,
      cancellationReason
    } = item.itemDetails

    // Type guard for DispensedItem
    const isDispensedItem = (itm: typeof item): itm is DispensedItem =>
      "initiallyPrescribed" in itm.itemDetails

    const hasInitial = isDispensedItem(item) && item.itemDetails.initiallyPrescribed

    return (
      <div key={`item-${index}`} className="data-panel__wrapper no-outline" tabIndex={-1}>
        <Card className="nhsuk-u-margin-bottom-3" style={{boxShadow: "none"}}>
          <Card.Content className="nhsuk-u-padding-top-3 nhsuk-u-padding-bottom-1
                                   nhsuk-u-padding-right-3 nhsuk-u-padding-left-3">
            <Card.Heading className="nhsuk-card__headingMVP nhsuk-heading-xs nhsuk-u-margin-bottom-1">
              <span>{medicationName}</span>
            </Card.Heading>

            {nhsAppStatus && (
              <p className="nhsuk-u-margin-bottom-2">
                <Tag color={getTagColourFromStatus(nhsAppStatus)}>
                  {nhsAppStatus}
                </Tag>
              </p>
            )}

            {itemPendingCancellation && (
              <p className="nhsuk-u-margin-bottom-2">
                ⚠️ {STRINGS.CANCELLATION_REASON_MESSAGE}
              </p>
            )}

            <SummaryList className="nhsuk-u-margin-bottom-2">
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

              <SummaryList.Row>
                <SummaryList.Key>{STRINGS.QUANTITY_LABEL}</SummaryList.Key>
                <SummaryList.Value>
                  <span className="data-field__content data-field__content--address">
                    {quantity}
                  </span>
                </SummaryList.Value>
              </SummaryList.Row>

              <SummaryList.Row>
                <SummaryList.Key>{STRINGS.INSTRUCTIONS_LABEL}</SummaryList.Key>
                <SummaryList.Value>
                  <span className="data-field__content data-field__content--address">
                    {dosageInstructions}
                  </span>
                </SummaryList.Value>
              </SummaryList.Row>

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

            {hasInitial && (
              <Details>
                <Details.Summary>{STRINGS.INITIALLY_PRESCRIBED_DETAILS}</Details.Summary>
                <Details.Text>
                  <SummaryList>
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
    <Col width="one-third" className="site-card-column">
      {dispensedItems.length > 0 && (
        <>
          <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">
            {STRINGS.DISPENSED_ITEMS_HEADER}
          </h2>
          {dispensedItems.map(renderCard)}
        </>
      )}

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
