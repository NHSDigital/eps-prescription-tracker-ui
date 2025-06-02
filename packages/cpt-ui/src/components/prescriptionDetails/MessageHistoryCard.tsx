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
import {formatMessageDateTime} from "@/helpers/formatters"
import {STRINGS} from "@/constants/ui-strings/MessageHistoryCardStrings"

interface MessageHistoryProps {
  readonly messageHistory: ReadonlyArray<MessageHistory>
}

export function MessageHistoryCard({messageHistory}: MessageHistoryProps) {
  if (!messageHistory || messageHistory.length === 0) return null

  return (
    <Col width="one-third">
      <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">{STRINGS.HISTORY_HEADER}</h2>
      <div className="data-panel__wrapper no-outline" tabIndex={-1}>
        <Card className="nhsuk-u-margin-bottom-3 data-panel" style={{boxShadow: "none"}}>
          <Card.Content className="nhsuk-u-padding-4">
            <div className="nhs-screening-whole-timeline" data-testid="message-history-timeline">
              {messageHistory.slice().reverse().map((msg) => (
                <div key={`${msg.sentDateTime}-${msg.organisationODS}`}
                  className="nhsuk-u-margin-bottom-4 nhs-screening-whole-timeline__item"
                  data-testid="prescription-message">

                  {/* Timeline Heading */}
                  <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
                    {getMessageHistoryHeader(msg.messageCode)}
                    <br />
                    {formatMessageDateTime(msg.sentDateTime)}
                  </Card.Heading>

                  {/* Organisation info */}
                  {msg.organisationName ? (
                    <p className="nhsuk-body-s nhsuk-u-margin-bottom-2 break-word">
                      {STRINGS.ORGANISATION} {msg.organisationName} ({STRINGS.ODS_TEXT}{msg.organisationODS})
                    </p>
                  ) : (
                    <p className="nhsuk-body-s nhsuk-u-margin-bottom-2 break-word"
                      data-testid="no-org-name-message">
                      {STRINGS.NO_ORG_NAME} ({STRINGS.ODS_TEXT}{msg.organisationODS})
                    </p>
                  )}

                  {/* Status tag */}
                  {msg.newStatusCode && (
                    <p className="nhsuk-body-s nhsuk-u-margin-bottom-2">
                      {STRINGS.NEW_STATUS}{" "}
                      <Tag color={getStatusTagColour(msg.newStatusCode)}
                        data-testid="new-status-code-tag">
                        {getStatusDisplayText(msg.newStatusCode)}
                      </Tag>
                    </p>
                  )}

                  {/* Dispense notification information */}
                  {msg.newStatusCode === "0006" && msg.dispenseNotification && msg.dispenseNotification.length > 0 && (
                    <Details className="nhsuk-u-padding-top-2 nhsuk-u-margin-bottom-0"
                      data-testid="message-history-dropdown">
                      <Details.Summary>
                        <span className="nhsuk-details__summary-text nhsuk-u-font-size-16">
                          {STRINGS.DISPENSE_NOTIFICATION_INFO}
                        </span>
                      </Details.Summary>
                      <Details.Text>
                        {/* Notification ID */}
                        <div className="nhs-screening-whole-timeline__description">
                          {STRINGS.DISPENSE_NOTIFICATION_ID} {msg.dispenseNotification[0].ID}
                        </div>

                        {/* Items List */}
                        <div className="nhs-screening-whole-timeline__description">
                          {STRINGS.PRESCRIPTION_ITEMS}
                          <ul className="nhsuk-u-padding-top-2">
                            {msg.dispenseNotification.map((item) => (
                              <li key={item.ID} className="nhsuk-u-font-size-16">
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
