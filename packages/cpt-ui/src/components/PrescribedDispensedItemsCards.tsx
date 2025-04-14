import {Card, Col, Tag} from "nhsuk-react-components"
import {DispensedItem} from "@cpt-ui-common/common-types/src/prescriptionDetails"
// import {getTagColourFromStatus} from "@/helpers/statusToTagColour"
import {PRESCRIPTION_DETAILS_PAGE_STRINGS as STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

interface PrescribedDispensedItemsProps {
  items: Array<DispensedItem>
}

export function PrescribedDispensedItems({items}: PrescribedDispensedItemsProps) {
  if (!items || items.length === 0) return null

  return (
    <Col width="one-third" className="site-card-column">
      <h1 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">
        {STRINGS.DISPENSED_ITEMS_TITLE}
      </h1>

      {items.map((item, index) => {
        const {medicationName, quantity, dosageInstructions, nhsAppStatus, pharmacyStatus} = item.itemDetails

        return (
          <div key={`dispensed-item-${index}`} className="data-panel__wrapper no-outline" tabIndex={-1}>
            <Card className="nhsuk-card nhsuk-u-margin-bottom-3" style={{boxShadow: "none"}}>
              <Card.Content
                className="nhsuk-card__content nhsuk-u-padding-top-3 nhsuk-u-padding-bottom-1
                nhsuk-u-padding-right-3 nhsuk-u-padding-left-3"
              >
                <h3 className="nhsuk-card__headingMVP nhsuk-heading-xs nhsuk-u-margin-bottom-1">
                  <span>{medicationName}</span>
                </h3>

                {nhsAppStatus && (
                  <p className="nhsuk-u-margin-bottom-2">
                    {/* <Tag color={getTagColourFromStatus(nhsAppStatus)}> */}
                    <Tag className="nhsuk-tag--green">
                      {nhsAppStatus}
                    </Tag>
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
      })}
    </Col>
  )
}
