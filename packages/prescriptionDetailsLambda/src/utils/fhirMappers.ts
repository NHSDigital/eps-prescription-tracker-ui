import {MedicationDispense, MedicationRequest} from "fhir/r4"
import {ItemDetails} from "@cpt-ui-common/common-types"
import {findExtensionByKey, getBooleanFromNestedExtension, getCodeFromNestedExtension} from "./extensionUtils"
import {Logger} from "@aws-lambda-powertools/logger"

/**
 *  Maps message history titles names to semantic message codes
 */
export const mapMessageHistoryTitleToMessageCode = (title: string, logger?: Logger): string => {
  const titleToCodeMap: Record<string, string> = {
    "Prescription upload successful": "prescription-uploaded",
    "Release Request successful": "release-requested",
    "Nominated Release Request successful": "nominated-release-requested",
    "Dispense notification successful": "dispense-notified",
    "Dispense claim successful": "dispense-claimed",
    "Dispense proposal return successful": "dispense-proposal-returned",
    "Dispense Withdrawal successful": "dispense-withdrawn",
    "Administrative update successful": "admin-updated",
    "Administrative Action Update Successful": "admin-action-updated",
    "Prescription Reset request successful": "prescription-reset",
    "Prescription/Item was cancelled": "prescription-cancelled",
    "Prescription/item was cancelled": "prescription-cancelled",

    "Prescription/item was not cancelled. With dispenser. Marked for cancellation":
      "prescription-marked-for-cancellation",
    "Prescription/item was not cancelled. With dispenser active. Marked for cancellation":
      "prescription-marked-for-cancellation",

    "Prescription or item was not cancelled. Prescription has been dispensed.":
      "prescription-not-cancelled-dispensed",

    "Prescription or item had expired.": "prescription-expired",

    "Prescription or item had already been cancelled.": "prescription-already-cancelled",

    "Prescription or item cancellation requested by another prescriber.":
      "prescription-cancellation-requested-other",

    "Prescription or item was not cancelled. Prescription has been not dispensed.":
      "prescription-not-cancelled-not-dispensed",

    "Prescription or item not found.": "prescription-or-item-not-found",
    "Unable to process message due to invalid information within the cancel request.":
      "cancel-request-invalid",
    // eslint-disable-next-line max-len
    "The item has been partially collected / received by the patient in a less quantity than was requested by the prescriber.":
      "item-partially-collected",
    // eslint-disable-next-line max-len
    "The item has been partially collected or received by the patient, in less quantity than was requested by prescriber.":
      "item-partially-collected",

    "Subsequent cancellation": "subsequent-cancellation",
    "Rebuild Dispense History successful": "dispense-history-rebuilt",
    "Updated by Urgent Admin Batch worker": "urgent-batch-updated",
    "Updated by Routine Admin Batch worker": "routine-batch-updated",
    "Updated by Non-Urgent Admin Batch worker": "non-urgent-batch-updated",
    "Updated by Document Batch worker": "document-batch-updated"
  }

  const mapped = titleToCodeMap[title]

  if (!mapped) {
    logger?.warn("missing mapping for Spine message title", {missingTitle: title})
    // fallback: show raw Spine message in UI
    return title
  }

  return mapped
}

/**
 * Determines prescription origin based on prescription type code
 */
export const mapPrescriptionOrigin = (typeCode: string): string => {
  if (typeCode.startsWith("01") || typeCode.startsWith("1")) return "England"
  if (typeCode.startsWith("02") || typeCode.startsWith("2")) return "Wales"
  if (typeCode.startsWith("05") || typeCode.startsWith("50")) return "Isle of Man"
  return "Unknown"
}

/**
 * Extracts dispensed items from FHIR MedicationDispense resources
 */
export const extractItems = (
  medicationRequests: Array<MedicationRequest>,
  medicationDispenses: Array<MedicationDispense>
): Array<ItemDetails> => {
  return medicationRequests.map((request) => {
    // find the corresponding medication request for initial prescription details and cancellation info
    const correspondingDispense = medicationDispenses.find(dispense =>
      request.id
      && dispense.authorizingPrescription?.[0]?.reference?.includes(request.id)
      && dispense.status === "in-progress"
    )
    // Extract notDispensedReason from extension
    const notDispensedReason = correspondingDispense?.statusReasonCodeableConcept?.coding?.[0]?.code

    // determine if initiallyPrescribed should be included (only if different from dispensed)
    const pendingCancellationExt = findExtensionByKey(request.extension, "PENDING_CANCELLATION")
    const itemPendingCancellation = getBooleanFromNestedExtension(pendingCancellationExt, "lineItemPendingCancellation")
    const cancellationReason = request.statusReason?.text ?? request.statusReason?.coding?.[0]?.code

    const businessStatusExt = findExtensionByKey(request.extension, "DISPENSING_INFORMATION")
    const epsStatusCode = getCodeFromNestedExtension(businessStatusExt, "dispenseStatus", "unknown")

    const medicationName = request.medicationCodeableConcept?.text ??
                                    request.medicationCodeableConcept?.coding?.[0]?.display ?? "Unknown"
    const originalQuantityValue = request.dispenseRequest?.quantity?.value?.toString() ?? "Unknown"
    const originalQuantityUnit = request.dispenseRequest?.quantity?.unit ?? ""
    const quantity = originalQuantityUnit ? `${originalQuantityValue} ${originalQuantityUnit}` : originalQuantityValue
    const dosageInstructions = request.dosageInstruction?.[0]?.text

    const pharmacyStatus = findExtensionByKey(
      request.extension,
      "DM_PRESCRIPTION_STATUS_UPDATE_HISTORY")
      ?.extension?.[0].valueCoding?.code

    return {
      medicationName,
      quantity,
      dosageInstructions,
      epsStatusCode,
      pharmacyStatus,
      itemPendingCancellation,
      cancellationReason,
      notDispensedReason
    }
  })
}
