import React from "react"
import {Button, Tag} from "nhsuk-react-components"

import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"

import {STRINGS} from "@/constants/ui-strings/PrescriptionInformationBannerStrings"

import {getStatusTagColour, getStatusDisplayText} from "@/helpers/statusMetadata"
import {formatIssueDate} from "@/helpers/formatters"

const PrescriptionInformationBanner: React.FC = () => {
  const {prescriptionInformation: prescription} = usePrescriptionInformation()

  if (!prescription) return null

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prescription.prescriptionId)
  }

  const renderType = () => {
    const baseText = STRINGS.PRESCRIPTION_TYPES[prescription.typeCode]
    // ERD prescriptions - show "eRD X of Y" format
    if (prescription.typeCode === "continuous-repeat-dispensing" &&
      prescription.instanceNumber &&
      prescription.maxRepeats) {
      return `${baseText} ${prescription.instanceNumber} of ${prescription.maxRepeats}`
    }

    // For other types, just use the base text
    return baseText || prescription.typeCode
  }

  return (
    <div className="prescription-information-banner" data-testid="prescription-information-banner">
      <div className="prescription-information-banner-row">
        <div className="patient-summary__block prescription-id-block" id="prescription-id">
          <span className="patient-summary__info no-margin-bottom">
            {STRINGS.PRESCRIPTION_ID}:<span id="copyText">{prescription.prescriptionId}</span>
          </span>
          <span className="patient-summary__info copy-button-wrapper">
            <Button
              id="copyButton"
              aria-label={STRINGS.COPY_BUTTON_ARIA_LABEL}
              className="nhsuk-button--reverse copy-button nhsuk-u-margin-1 nhsuk-u-margin-right-4"
              onClick={copyToClipboard}
              type="button"
              secondary
            >
              {STRINGS.COPY_BUTTON_TEXT}
            </Button>
          </span>
        </div>
        <div className="patient-summary__block" id="summary-issue-date">
          <span className="patient-summary__info">
            {STRINGS.ISSUE_DATE}: {formatIssueDate(prescription.issueDate)}
          </span>
        </div>
        <div className="patient-summary__block" id="summary-status">
          <span className="patient-summary__info">
            {STRINGS.STATUS}:{" "}
            <Tag color={getStatusTagColour(prescription.statusCode)}>
              {getStatusDisplayText(prescription.statusCode)}
            </Tag>
          </span>
        </div>
        <div className="patient-summary__block" id="summary-type">
          <span className="patient-summary__info">
            {STRINGS.TYPE}: {renderType()}
          </span>
        </div>
        {prescription.daysSupply && (
          <div className="patient-summary__block" id="summary-erd-days">
            <span className="patient-summary__info">
              {STRINGS.DAYS_SUPPLY}: {prescription.daysSupply} days
            </span>
          </div>
        )}
      </div>
      <div id="patientview-sentinel" style={{height: "1px", backgroundColor: "transparent"}} />
    </div>
  )
}

export default PrescriptionInformationBanner
