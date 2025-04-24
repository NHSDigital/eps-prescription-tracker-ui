import {Col, Card, Tag} from "nhsuk-react-components"
import {MessageHistory} from "@cpt-ui-common/common-types"
import {getStatusTagColour, getStatusDisplayText, getMessageHistoryHeader} from "@/helpers/statusMetadata"

interface MessageHistoryProps {
  messageHistory: Array<MessageHistory>
}

export function MessageHistoryCard({messageHistory}: MessageHistoryProps) {
  if (!messageHistory || messageHistory.length === 0) return null

  const firstMessage = messageHistory[0]

  return (
    <Col width="one-third">
      <h2 className="nhsuk-heading-xs nhsuk-u-margin-bottom-2">History</h2>
      <div className="data-panel__wrapper no-outline" tabIndex={-1}>
        <Card className="nhsuk-u-margin-bottom-3 data-panel" style={{boxShadow: "none"}}>
          <Card.Content className="nhsuk-u-padding-4">
            <Card.Heading headingLevel="H3" className="nhsuk-heading-xs nhsuk-u-margin-bottom-1">
              {getMessageHistoryHeader(firstMessage.messageText)}
              <br />
              {firstMessage.sentDateTime}
            </Card.Heading>
            <p className="nhsuk-body-s nhsuk-u-margin-bottom-2">
              Organisation: {firstMessage.organisationName} (ODS:{firstMessage.organisationODS})
            </p>
            <p className="nhsuk-body-s nhsuk-u-margin-bottom-2">
              New status:{" "}
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
