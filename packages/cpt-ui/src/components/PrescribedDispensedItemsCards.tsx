import {Card, Col, Tag} from "nhsuk-react-components"
import {DispensedItem} from "@cpt-ui-common/common-types/src/prescriptionDetails"
import {getTagColourFromStatus, getStatusCategory} from "@/helpers/statusToTagColour"
import {STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

interface PrescribedDispensedItemsProps {
  items: Array<DispensedItem>
}

export function PrescribedDispensedItemsCards({items}: PrescribedDispensedItemsProps) {
  if (!items || items.length === 0) return null

  const dispensedItems = items.filter(item =>
    getStatusCategory(item.itemDetails.nhsAppStatus || "") === "dispensed"
  )

  const prescribedItems = items.filter(item =>
    getStatusCategory(item.itemDetails.nhsAppStatus || "") === "prescribed"
  )

  const renderItemCard = (item: DispensedItem, index: number) => {
    const {
      medicationName,
      quantity,
      dosageInstructions,
      nhsAppStatus,
      pharmacyStatus
    } = item.itemDetails

    return (
      <div key={`item-${index}`} className="data-panel__wrapper no-outline" tabIndex={-1}>
        <Card className="nhsuk-u-margin-bottom-3" style={{boxShadow: "none"}}>
          <Card.Content className="nhsuk-u-padding-top-3 nhsuk-u-padding-bottom-1
                                  nhsuk-u-padding-right-3 nhsuk-u-padding-left-3">
            <h3 className="nhsuk-card__headingMVP nhsuk-heading-xs nhsuk-u-margin-bottom-1">
              <span>{medicationName}</span>
            </h3>

            {nhsAppStatus && (
              <p className="nhsuk-u-margin-bottom-2">
                <Tag color={getTagColourFromStatus(nhsAppStatus)}>{nhsAppStatus}</Tag>
              </p>
            )}

            <dl className="nhsuk-summary-list nhsuk-u-margin-bottom-2">
              <div className="nhsuk-summary-list__row nhsuk-u-padding-top-0 nhsuk-u-padding-bottom-0">
                <dt className="nhsuk-summary-list__key">{STRINGS.QUANTITY_LABEL}</dt>
                <dd className="nhsuk-summary-list__value">
                  <span className="data-field__content data-field__content--address">{quantity}</span>
                </dd>
              </div>
              <div className="nhsuk-summary-list__row nhsuk-u-padding-top-0 nhsuk-u-padding-bottom-0">
                <dt className="nhsuk-summary-list__key">{STRINGS.INSTRUCTIONS_LABEL}</dt>
                <dd className="nhsuk-summary-list__value">
                  <span className="data-field__content data-field__content--address">{dosageInstructions}</span>
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
          {dispensedItems.map(renderItemCard)}
        </>
      )}

      {prescribedItems.length > 0 && (
        <>
          <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">
            {STRINGS.PRESCRIBED_ITEMS_HEADER}
          </h2>
          {prescribedItems.map(renderItemCard)}
        </>
      )}
    </Col>
  )
}
