import {
  Card,
  Col,
  Tag,
  Details
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

    // Type guard for DispensedItem with initiallyPrescribed
    const hasInitial =
      "initiallyPrescribed" in item.itemDetails && item.itemDetails.initiallyPrescribed

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
              <p className="nhsuk-u-margin-bottom-2">⚠️ {STRINGS.CANCELLATION_REASON_MESSAGE}</p>
            )}

            <dl className="nhsuk-summary-list nhsuk-u-margin-bottom-2">
              {cancellationReason && (
                <div className="nhsuk-summary-list__row">
                  <dt className="nhsuk-summary-list__key">{STRINGS.CANCELLATION_REASON}</dt>
                  <dd className="nhsuk-summary-list__value">
                    <span className="data-field__content data-field__content--address">
                      {cancellationReason}
                    </span>
                  </dd>
                </div>
              )}

              <div className="nhsuk-summary-list__row nhsuk-u-padding-top-0 nhsuk-u-padding-bottom-0">
                <dt className="nhsuk-summary-list__key">{STRINGS.QUANTITY_LABEL}</dt>
                <dd className="nhsuk-summary-list__value">
                  <span className="data-field__content data-field__content--address">
                    {quantity}
                  </span>
                </dd>
              </div>

              <div className="nhsuk-summary-list__row nhsuk-u-padding-top-0 nhsuk-u-padding-bottom-0">
                <dt className="nhsuk-summary-list__key">{STRINGS.INSTRUCTIONS_LABEL}</dt>
                <dd className="nhsuk-summary-list__value">
                  <span className="data-field__content data-field__content--address">
                    {dosageInstructions}
                  </span>
                </dd>
              </div>

              {pharmacyStatus && (
                <div className="nhsuk-summary-list__row">
                  <dt className="nhsuk-summary-list__key">{STRINGS.PHARMACY_STATUS_LABEL}</dt>
                  <dd className="nhsuk-summary-list__value">
                    <span className="data-field__content data-field__content--address">
                      <Tag>{pharmacyStatus}</Tag>
                    </span>
                  </dd>
                </div>
              )}
            </dl>

            {hasInitial && (
              <Details closed>
                <Details.Summary>
                  {STRINGS.INITIALLY_PRESCRIBED_DETAILS}
                </Details.Summary>
                <Details.Text>
                  <dl className="nhsuk-summary-list">
                    <div className="nhsuk-summary-list__row">
                      <dt className="nhsuk-summary-list__key">
                        {STRINGS.INITIALLY_PRESCRIBED_ITEM}
                      </dt>
                      <dd className="nhsuk-summary-list__value">
                        {item.itemDetails.initiallyPrescribed.medicationName}
                      </dd>
                    </div>
                    <div className="nhsuk-summary-list__row">
                      <dt className="nhsuk-summary-list__key">
                        {STRINGS.INITIALLY_PRESCRIBED_QUANTITY}
                      </dt>
                      <dd className="nhsuk-summary-list__value">
                        {item.itemDetails.initiallyPrescribed.quantity}
                      </dd>
                    </div>
                    <div className="nhsuk-summary-list__row">
                      <dt className="nhsuk-summary-list__key">
                        {STRINGS.INITIALLY_PRESCRIBED_INSTRUCTION}
                      </dt>
                      <dd className="nhsuk-summary-list__value">
                        {item.itemDetails.initiallyPrescribed.dosageInstructions}
                      </dd>
                    </div>
                  </dl>
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
