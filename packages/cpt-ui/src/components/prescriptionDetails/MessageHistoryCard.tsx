import {Col, Card, Tag} from "nhsuk-react-components"
import {MessageHistory} from "@cpt-ui-common/common-types"
import {getStatusTagColour, getStatusDisplayText, getMessageHistoryHeader} from "@/helpers/statusMetadata"
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
                  <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1 ">
                    {getMessageHistoryHeader(msg.messageText)}
                    <br />
                    {msg.sentDateTime}
                  </Card.Heading>
                  <p className="nhsuk-body-s nhsuk-u-margin-bottom-2">
                    {STRINGS.ORGANISATION} {msg.organisationName} ({STRINGS.ODS_TEXT}{msg.organisationODS})
                  </p>
                  <p className="nhsuk-body-s nhsuk-u-margin-bottom-2">
                    {STRINGS.NEW_STATUS}{" "}
                    <Tag color={getStatusTagColour(msg.newStatusCode)}>
                      {getStatusDisplayText(msg.newStatusCode)}
                    </Tag>
                  </p>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </div>
    </Col>
  )
}
