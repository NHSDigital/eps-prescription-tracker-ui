import {
  Col,
  Card,
  Tag,
  Details
} from "nhsuk-react-components"
import {MessageHistory} from "@cpt-ui-common/common-types"
import {
  getStatusTagColour,
  getStatusDisplayText,
  getItemStatusTagColour,
  getItemStatusDisplayText,
  getMessageHistoryHeader
} from "@/helpers/statusMetadata"
import {STRINGS} from "@/constants/ui-strings/MessageHistoryCardStrings"

interface MessageHistoryProps {
  messageHistory: Array<MessageHistory>
}

export function MessageHistoryCard({messageHistory}: MessageHistoryProps) {
  if (!messageHistory || messageHistory.length === 0) return null

  return (
    <Col width="one-third">
      <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">{STRINGS.HISTORY_HEADER}</h2>
      <div className="data-panel__wrapper no-outline" tabIndex={-1}>
        <Card className="nhsuk-u-margin-bottom-3 data-panel" style={{boxShadow: "none"}}>
          <Card.Content className="nhsuk-u-padding-4">
            <div className="nhs-screening-whole-timeline">
              {messageHistory.map((msg, index) => (
                <div key={index} className="nhsuk-u-margin-bottom-4 nhs-screening-whole-timeline__item">

                  {/* Timeline Heading */}
                  <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
                    {getMessageHistoryHeader(msg.messageText)}
                    <br />
                    {msg.sentDateTime}
                  </Card.Heading>

                  {/* Organisation info */}
                  <p className="nhsuk-body-s nhsuk-u-margin-bottom-2 break-word">
                    {STRINGS.ORGANISATION}{" "}
                    {msg.organisationName
                      ? `${msg.organisationName} (${STRINGS.ODS_TEXT}${msg.organisationODS})`
                      : `Site name not available. Try again later. (${STRINGS.ODS_TEXT}${msg.organisationODS})`
                    }
                  </p>

                  {/* Status tag */}
                  {msg.newStatusCode && (
                    <p className="nhsuk-body-s nhsuk-u-margin-bottom-2">
                      {STRINGS.NEW_STATUS}{" "}
                      <Tag color={getStatusTagColour(msg.newStatusCode)}>
                        {getStatusDisplayText(msg.newStatusCode)}
                      </Tag>
                    </p>
                  )}

                  {/* Dispense notification information */}
                  {msg.newStatusCode === "0006" && msg.dispenseNotification && msg.dispenseNotification.length > 0 && (
                    <Details className="nhsuk-u-padding-top-2 nhsuk-u-margin-bottom-0">
                      <Details.Summary>
                        <span className="nhsuk-details__summary-text nhsuk-u-font-size-16">
                          {STRINGS.DISPENSE_NOTIFICATION_INFO}
                        </span>
                      </Details.Summary>
                      <Details.Text>
                        {/* Notification ID */}
                        <div className="nhs-screening-whole-timeline__description">
                          {STRINGS.DISPENSE_NOTIFICATION_ID} {msg.dispenseNotification![0].ID}
                        </div>

                        {/* Items List */}
                        <div className="nhs-screening-whole-timeline__description">
                          {STRINGS.PRESCRIPTION_ITEMS}
                          <ul className="nhsuk-u-padding-top-2">
                            {msg.dispenseNotification!.map((item, idx) => (
                              <li key={idx} className="nhsuk-u-font-size-16">
                                {item.medicationName}
                                <br />
                                <Tag color={getItemStatusTagColour("0001")}>
                                  {getItemStatusDisplayText("0001")}
                                </Tag>
                                <br />
                                {STRINGS.QUANTITY} {item.quantity}
                                <br />
                                {STRINGS.INSTRUCTIONS} {item.dosageInstruction}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Details.Text>
                    </Details>
                  )}
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </div>
    </Col>
  )
}
