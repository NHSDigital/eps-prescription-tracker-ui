import {PrescriptionDetailsResponse} from "@cpt-ui-common/common-types"

export const STRINGS = {
  PRESCRIPTION_INFORMATION: "Prescription Information",
  PRESCRIPTION_ID: "Prescription ID",
  COPY_BUTTON_ARIA_LABEL: "Copy this prescription ID to the clipboard",
  COPY_BUTTON_TEXT: "Copy",
  ISSUE_DATE: "Issue date",
  STATUS: "Status",
  TYPE: "Type",
  DAYS_SUPPLY: "Days supply",
  PRESCRIPTION_TYPES: {
    "acute": "Acute",
    "continuous": "Repeat",
    "continuous-repeat-dispensing": "eRD"
  } satisfies Record<PrescriptionDetailsResponse["typeCode"], string>,
  CANCELLATION_REASON: "Cancellation reason",
  NOT_DISPENSED_REASON: "Not dispensed reason"
}
