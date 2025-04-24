import {Col, Card, Tag} from "nhsuk-react-components"
import {MessageHistory} from "@cpt-ui-common/common-types"
import {getStatusTagColour, getStatusDisplayText, getMessageHistoryHeader} from "@/helpers/statusMetadata"
import {STRINGS} from "@/constants/ui-strings/MessageHistoryCardStrings"

interface MessageHistoryProps {
  messageHistory: Array<MessageHistory>
}

export function MessageHistoryCard({messageHistory}: MessageHistoryProps) {
  if (!messageHistory || messageHistory.length === 0) return null

  const firstMessage = messageHistory[0]

  return (
    <Col width="one-third">
      <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">{STRINGS.HISTORY_HEADER}</h2>
      <div className="data-panel__wrapper no-outline" tabIndex={-1}>
        <Card className="nhsuk-u-margin-bottom-3 data-panel" style={{boxShadow: "none"}}>
          <Card.Content className="nhsuk-u-padding-4">
            <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
              {getMessageHistoryHeader(firstMessage.messageText)}
              <br />
              {firstMessage.sentDateTime}
            </Card.Heading>
            <p className="nhsuk-body-s nhsuk-u-margin-bottom-2">
              {STRINGS.ORGANISATION} {firstMessage.organisationName} ({STRINGS.ODS_TEXT}{firstMessage.organisationODS})
            </p>
            <p className="nhsuk-body-s nhsuk-u-margin-bottom-2">
              {STRINGS.NEW_STATUS} {" "}
              <Tag color={getStatusTagColour(firstMessage.newStatusCode)}>
                {getStatusDisplayText(firstMessage.newStatusCode)}
              </Tag>
            </p>
          </Card.Content>
        </Card>
      </div>
    </Col>
  )
}
