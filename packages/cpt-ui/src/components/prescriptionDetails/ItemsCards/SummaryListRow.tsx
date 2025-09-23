import {TagColour} from "@/helpers/statusMetadata"
import {SummaryList, Tag} from "nhsuk-react-components"
interface SummaryListRowProps {
  readonly label: string
  readonly value?: string
  readonly tagValue?: string
  readonly tagColour?: TagColour
}
export const SummaryListRow = ({label, value, tagValue, tagColour}: SummaryListRowProps) => {
  return (
    <SummaryList.Row>
      <SummaryList.Key>{label}</SummaryList.Key>
      <SummaryList.Value>
        <span className="data-field__content data-field__content--address">
          {value}
          {tagValue && (
            <Tag color={tagColour}>
              {tagValue}
            </Tag>
          )}
        </span>
      </SummaryList.Value>
    </SummaryList.Row>
  )
}
