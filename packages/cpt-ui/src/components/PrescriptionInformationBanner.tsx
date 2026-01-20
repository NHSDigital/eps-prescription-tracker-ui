import React, {useState} from "react"
import {Button} from "nhsuk-react-components"

import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"

import {STRINGS} from "@/constants/ui-strings/PrescriptionInformationBannerStrings"

import {getStatusTagColour, getStatusDisplayText} from "@/helpers/statusMetadata"
import {formatIssueDate} from "@/helpers/formatters"
import {BannerField} from "@/components/PrescriptionInformationBanner/BannerField"
import {CANCELLATION_REASON_MAP, NON_DISPENSING_REASON_MAP} from "@/constants/ui-strings/StatusReasonStrings"

const PrescriptionInformationBanner: React.FC = () => {
  const {prescriptionInformation: prescription} = usePrescriptionInformation()
  const [screenReaderMessage, setScreenReaderMessage] = useState("")

  if (!prescription) return null

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prescription.prescriptionId)
    setScreenReaderMessage("")
    setTimeout(() => setScreenReaderMessage("copied"), 10)
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
      <h2 className="nhsuk-u-visually-hidden">{STRINGS.PRESCRIPTION_INFORMATION}</h2>
      <div className="prescription-information-banner-row">
        <div className="patient-summary__block prescription-id-block" id="prescription-id">
          <span className="patient-summary__info no-margin-bottom">
            {STRINGS.PRESCRIPTION_ID}:<span id="copyText">{prescription.prescriptionId}</span>
          </span>
          <span className="patient-summary__info copy-button-wrapper">
            <Button
              id="copyButton"
              aria-label={STRINGS.COPY_BUTTON_ARIA_LABEL}
              className="nhsuk-button--reverse nhsuk-button--small copy-button nhsuk-u-margin-1 nhsuk-u-margin-right-4"
              onClick={copyToClipboard}
              type="button"
              secondary
            >
              {STRINGS.COPY_BUTTON_TEXT}
            </Button>
          </span>
        </div>
        <BannerField name="issue-date" label={STRINGS.ISSUE_DATE} value={formatIssueDate(prescription.issueDate)}/>
        <BannerField
          name="status"
          label={STRINGS.STATUS}
          value={" "}
          tagColour={getStatusTagColour(prescription.statusCode)}
          tagValue={getStatusDisplayText(prescription.statusCode)}
        />
        {prescription.cancellationReason && (
          <BannerField
            name="cancellation-reason"
            label={STRINGS.CANCELLATION_REASON}
            value={CANCELLATION_REASON_MAP[prescription.cancellationReason]}
          />
        )}
        {prescription.nonDispensingReason && (
          <BannerField
            name="not-dispensed-reason"
            label={STRINGS.NOT_DISPENSED_REASON}
            value={NON_DISPENSING_REASON_MAP[prescription.nonDispensingReason]}/>
        )}
        <BannerField name="type" label={STRINGS.TYPE} value={renderType()}/>
        {prescription.daysSupply && (
          <BannerField name="erd-days" label={STRINGS.DAYS_SUPPLY} value={`${prescription.daysSupply} days`}/>
        )}
      </div>
      <span
        aria-live="polite"
        aria-atomic="true"
        className="screen-reader-only"
      >{screenReaderMessage}</span>
      <div id="patientview-sentinel" style={{height: "1px", backgroundColor: "transparent"}} />
    </div>
  )
}

export default PrescriptionInformationBanner
