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
    // ERD prescriptions - show "eRD X of Y" format
    if ((prescription.typeCode === "continuous-repeat-dispensing" || prescription.isERD === true) &&
      prescription.instanceNumber !== undefined &&
      prescription.maxRepeats !== undefined) {
      return `eRD ${prescription.instanceNumber} of ${prescription.maxRepeats}`
    }

    // Map specific type codes to display names
    switch (prescription.typeCode) {
      case "continuous-repeat-dispensing":
        return "eRD"
      case "continuous":
        return "Repeat"
      case "acute":
        return "Acute"
      default:
        return prescription.typeCode
    }
  }

  const isERDPrescription = () => {
    return prescription.typeCode === "continuous-repeat-dispensing" ||
      prescription.isERD === true
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
        {isERDPrescription() && prescription.daysSupply !== undefined && (
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
