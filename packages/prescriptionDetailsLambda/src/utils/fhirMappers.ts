import {MedicationDispense, MedicationRequest, Patient} from "fhir/r4"
import {ItemDetails, PatientDetails} from "@cpt-ui-common/common-types"
import {findExtensionByKey, getBooleanFromNestedExtension, getCodeFromNestedExtension} from "./extensionUtils"

/**
 *  Maps message history titles names to semantic message codes
 */
export const mapMessageHistoryTitleToMessageCode = (title: string): string => {
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
    "Prescription/item was cancelled": "prescription-cancelled",
    "Prescription/item was not cancelled. With dispenser. Marked for cancellation":
      "prescription-marked-for-cancellation",
    "Subsequent cancellation": "subsequent-cancellation",
    "Rebuild Dispense History successful": "dispense-history-rebuilt",
    "Updated by Urgent Admin Batch worker": "urgent-batch-updated",
    "Updated by Routine Admin Batch worker": "routine-batch-updated",
    "Updated by Non-Urgent Admin Batch worker": "non-urgent-batch-updated",
    "Updated by Document Batch worker": "document-batch-updated"
  }

  return titleToCodeMap[title]
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
 * Extracts patient details from FHIR Patient resource
 */
export const extractPatientDetails = (patient: Patient): PatientDetails => {
  // Extract NHS number from identifiers
  const nhsNumber = patient.identifier?.[0]?.value ?? "Unknown"

  // Extract name components
  const name = patient.name?.[0]
  const prefix = name?.prefix?.[0] ?? ""
  const suffix = name?.suffix?.[0] ?? ""
  const given = name?.given?.join(" ") ?? "Unknown"
  const family = name?.family ?? "Unknown"

  // Extract address components
  const patientAddress = patient.address?.[0]
  let address = "Not Found"
  if (patientAddress) {
    address = patientAddress.text!
  }

  return {
    nhsNumber,
    prefix,
    suffix,
    given,
    family,
    gender: patient.gender ?? null,
    dateOfBirth: patient.birthDate ?? null,
    address
  }
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
    const cancellationReason = request.statusReason?.text ?? request.statusReason?.coding?.[0]?.display

    const businessStatusExt = findExtensionByKey(request.extension, "DISPENSING_INFORMATION")
    const epsStatusCode = getCodeFromNestedExtension(businessStatusExt, "dispenseStatus", "unknown")

    const medicationName = request.medicationCodeableConcept?.text ??
                                    request.medicationCodeableConcept?.coding?.[0]?.display ?? "Unknown"
    const originalQuantityValue = request.dispenseRequest?.quantity?.value?.toString() ?? "Unknown"
    const originalQuantityUnit = request.dispenseRequest?.quantity?.unit ?? ""
    const quantity = originalQuantityUnit ? `${originalQuantityValue} ${originalQuantityUnit}` : originalQuantityValue
    const dosageInstructions = request.dosageInstruction?.[0]?.text

    const psuStatus = findExtensionByKey(
      request.extension,
      "DM_PRESCRIPTION_STATUS_UPDATE_HISTORY")
      ?.extension?.[0].valueCoding?.code

    return {
      medicationName,
      quantity,
      dosageInstructions,
      epsStatusCode,
      psuStatus,
      itemPendingCancellation,
      cancellationReason,
      notDispensedReason
    }
  })
}
