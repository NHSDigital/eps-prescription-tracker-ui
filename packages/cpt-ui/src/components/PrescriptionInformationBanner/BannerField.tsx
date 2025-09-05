import {TagColour} from "@/helpers/statusMetadata"
import {Tag} from "nhsuk-react-components"

interface BannerFieldProps {
  readonly name: string
  readonly label: string
  readonly value: string
  readonly tagValue?: string
  readonly tagColour?: TagColour
}

export const BannerField = ({name, label, value, tagValue, tagColour}: BannerFieldProps) => {
  return (
    <div className="patient-summary__block" id={`summary-${name}`}>
      <span className="patient-summary__info">
        {label}: {value}
        {tagValue && (
          <Tag color={tagColour}>
            {tagValue}
          </Tag>
        )}
      </span>
    </div>
  )
}
