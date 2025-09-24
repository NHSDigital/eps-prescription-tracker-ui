/* eslint-disable max-len */
export const PRESCRIPTION_MESSAGES: Record<string, string> = {
  "prescription-uploaded": "Prescription has been uploaded",
  "release-requested": "Dispenser has downloaded the prescription",
  "nominated-release-requested": "Dispenser has downloaded this in a batch of nominated prescriptions",
  "dispense-notified": "Dispenser has sent a dispense notification",
  "dispense-claimed": "Dispenser has sent a claim notification",
  "dispense-proposal-returned": "This prescription has been returned by a dispenser and may be downloaded again",
  "dispense-withdrawn": "Dispenser has removed the dispense notification",
  "admin-updated": "An update has been made by an EPS Prescription Tracker system administrator",
  "admin-action-updated": "An action update has been made by an EPS Prescription Tracker system administrator",
  "prescription-reset": "Dispenser has requested to reset the prescription",
  "prescription-cancelled": "This prescription or item was cancelled",

  "prescription-marked-for-cancellation":
    "This prescription has a pending cancellation, but the prescription or items on it have not been cancelled as it has been downloaded by a dispenser",

  "subsequent-cancellation":
    "This prescription or item was cancelled as the prescription was returned or the items to be cancelled were recorded as 'Not Dispensed'",
  "dispense-history-rebuilt": "Dispenser has corrected the prescription's dispensing history",
  "urgent-batch-updated": "Updated by Urgent Admin Batch worker at NHS England (an internal EPS system event)",
  "routine-batch-updated": "Updated by Routine Admin Batch worker at NHS England (an internal EPS system event)",
  "non-urgent-batch-updated": "Updated by Non-Urgent Admin Batch worker at NHS England (an internal EPS system event)",
  "document-batch-updated": "Updated by Document Batch worker at NHS England (an internal EPS system event)",

  "prescription-not-cancelled-dispensed":
    "A prescriber requested to cancel this prescription or item, but it has already been dispensed",
  "prescription-expired":
    "This prescription or item has expired, so it cannot be cancelled",
  "prescription-already-cancelled":
    "A prescriber requested to cancel this prescription or item, but it had been cancelled already",
  "prescription-cancellation-requested-other":
    "This prescription or item is pending cancellation requested by a different prescriber",
  "prescription-not-cancelled-not-dispensed":
    "This prescription or item was marked as 'Not dispensed' by the dispenser, so it cannot be cancelled by the prescriber",
  "prescription-or-item-not-found":
    "Information about this prescription or item cannot be found",
  "cancel-request-invalid":
    "This cancellation request has not been processed because the prescriber did not give enough information",

  "item-partially-collected":
    "The item has been partially collected or received by the patient, in less quantity than was requested by prescriber"
}
