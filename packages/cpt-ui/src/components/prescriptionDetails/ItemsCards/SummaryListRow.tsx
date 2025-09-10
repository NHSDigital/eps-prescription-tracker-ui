import {SummaryList} from "nhsuk-react-components"
import React from "react"

interface SummaryListRowProps {
  readonly label: string
  readonly value: React.ReactNode
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
