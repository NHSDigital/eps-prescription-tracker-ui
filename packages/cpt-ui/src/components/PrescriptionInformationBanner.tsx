import React from "react"
import {Button, Tag} from "nhsuk-react-components"

import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"

import {STRINGS} from "@/constants/ui-strings/PrescriptionInformationBannerStrings"

const PrescriptionInformationBanner: React.FC = () => {
  const {prescriptionInformation: prescription} = usePrescriptionInformation()

  if (!prescription) return null

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prescription.prescriptionID)
  }

  const renderType = () => {
    if (prescription.isERD && prescription.instanceNumber !== undefined && prescription.maxRepeats !== undefined) {
      return `${prescription.typeCode} ${prescription.instanceNumber} of ${prescription.maxRepeats}`
    }
    return prescription.typeCode
  }

  return (
    <div className="prescription-information-banner" data-testid="prescription-information-banner">
      <div className="prescription-information-banner-row">
        <div className="patient-summary__block prescription-id-block" id="prescription-id">
          <span className="patient-summary__info no-margin-bottom">
            {STRINGS.PRESCRIPTION_ID}:<span id="copyText">{prescription.prescriptionID}</span>
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
            {STRINGS.ISSUE_DATE}: {prescription.issueDate}
          </span>
        </div>
        <div className="patient-summary__block" id="summary-status">
          <span className="patient-summary__info">
            {STRINGS.STATUS}: <Tag className="nhsuk-tag--green">{prescription.statusCode}</Tag>
          </span>
        </div>
        <div className="patient-summary__block" id="summary-type">
          <span className="patient-summary__info">
            {STRINGS.TYPE}: {renderType()}
          </span>
        </div>
        {prescription.isERD && prescription.daysSupply !== undefined && (
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
