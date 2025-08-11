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
                <div key={`${msg.sentDateTime}-${msg.orgODS}`}
                  className="nhsuk-u-margin-bottom-4 nhs-screening-whole-timeline__item"
                  data-testid="prescription-message">

                  {/* Timeline Heading */}
                  <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
                    {getMessageHistoryHeader(msg.messageCode)}
                    <br />
                    {formatMessageDateTime(msg.sentDateTime)}
                  </Card.Heading>

                  {/* Organisation info */}
                  {msg.orgName ? (
                    <p className="nhsuk-body-s nhsuk-u-margin-bottom-2 break-word">
                      {STRINGS.ORGANISATION} {msg.orgName} ({STRINGS.ODS_TEXT}{msg.orgODS})
                    </p>
                  ) : (
                    <p className="nhsuk-body-s nhsuk-u-margin-bottom-2 break-word"
                      data-testid="no-org-name-message">
                      {STRINGS.NO_ORG_NAME} ({STRINGS.ODS_TEXT}{msg.orgODS})
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
                  {msg.dispenseNotificationItems && msg.dispenseNotificationItems.length > 0 && (
                    <Details className="nhsuk-u-padding-top-2 nhsuk-u-margin-bottom-0"
                      data-testid="message-history-dropdown">
                      <Details.Summary>
                        <span className="nhsuk-details__summary-text nhsuk-u-font-size-16">
                          {STRINGS.DISPENSE_NOTIFICATION_INFO}
                        </span>
                      </Details.Summary>
                      <Details.Text>
                        {/* Items List */}
                        <div className="nhs-screening-whole-timeline__description">
                          {STRINGS.PRESCRIPTION_ITEMS}
                          <ol className="nhsuk-u-padding-top-2">
                            {msg.dispenseNotificationItems.map((item, index) => (
                              <li key={index} className="nhsuk-u-font-size-16">
                                <Tag color={getItemStatusTagColour(item.statusCode)}>
                                  {getItemStatusDisplayText(item.statusCode)}
                                </Tag>
                                {item.components.map((component, compIndex) => (
                                  <div key={compIndex}>
                                    {component.medicationName}
                                    <br />
                                    {STRINGS.QUANTITY} {component.quantity}
                                    <br />
                                    {STRINGS.INSTRUCTIONS} {component.dosageInstruction}
                                  </div>
                                ))}
                              </li>
                            ))}
                          </ol>
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
