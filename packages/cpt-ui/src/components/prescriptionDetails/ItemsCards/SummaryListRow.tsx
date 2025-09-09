import {SummaryList} from "nhsuk-react-components"

interface SummaryListRowProps {
  readonly label: string
  readonly value: string
}

export const SummaryListRow = ({label, value}: SummaryListRowProps) => {
  return (
    <SummaryList.Row>
      <SummaryList.Key>{label}</SummaryList.Key>
      <SummaryList.Value>
        <span className="data-field__content data-field__content--address">
          {value}
        </span>
      </SummaryList.Value>
    </SummaryList.Row>
  )
}
