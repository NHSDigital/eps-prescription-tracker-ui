/* eslint-disable max-len */
import {Patient, MedicationRequest, Coding} from "fhir/r4"
import {PrescriptionIntent} from "./types"
import {findExtensionByKey, getBooleanFromNestedExtension, getDisplayFromNestedExtension} from "./extensionUtils"
import { PatientDetails } from "@cpt-ui-common/common-types"

/**
 * Maps the FHIR intent to a user-friendly prescription treatment type display value.
 * Since FHIR uses standardized intent values, we must convert them into human-readable descriptions.
 */
export const mapIntentToPrescriptionTreatmentType = (intent: string): string => {
  const intentToTreatmentTypeMap: Record<PrescriptionIntent, string> = {
    // TODO: double check this mapping with the team
    "order": "Acute", // Standard prescription → Acute
    "instance-order": "Repeat Prescribing", // Sub-order → Repeat Prescribing
    "reflex-order": "Repeat Dispensing" // Self-repeating order → Repeat Dispensing
  }

  // fallback to Unknown if we get something unexpected
  return intentToTreatmentTypeMap[intent as PrescriptionIntent] || "Unknown" // Default to "Unknown" if not mapped
}

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
    "Prescription/item was not cancelled. With dispenser. Marked for cancellation": "prescription-marked-for-cancellation",
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
 * Maps course of therapy type codes to display values
 */
export const mapCourseOfTherapyType = (coding: Array<Coding> | undefined): string => {
  if (!coding || coding.length === 0) return "Unknown"

  // const courseOfTherapyMap: Record<string, string> = {
  //   "acute": "Acute",
  //   "continuous": "Continuous",
  //   "continuous-repeating-dispensing": "Continuous Repeating Dispensing"
  // }

  // return courseOfTherapyMap[coding[0].code || ""] || coding[0].display || "Unknown"
  return coding[0].code || "unknown"
}

/**
 * Determines prescription origin based on prescription type code
 */
export const mapPrescriptionOrigin = (typeCode: string): string => {
  if (typeCode.startsWith("01") || typeCode.startsWith("1")) return "England"
  if (typeCode.startsWith("02") || typeCode.startsWith("2")) return "Wales"
  return "Unknown"
}

/**
 * Extracts patient details from FHIR Patient resource
 */
export const extractPatientDetails = (patient: Patient | undefined): PatientDetails => {
  if (!patient) {
    return {
      nhsNumber: "Unknown",
      prefix: "",
      suffix: "",
      given: "Unknown",
      family: "Unknown",
      gender: null,
      dateOfBirth: null,
      address: null
    }
  }

  // Extract NHS number from identifiers
  const nhsNumber = patient.identifier?.[0]?.value || "Unknown"

  // Extract name components
  const name = patient.name?.[0]
  const prefix = name?.prefix?.[0] || ""
  const suffix = name?.suffix?.[0] || ""
  const given = name?.given?.join(" ") || "Unknown"
  const family = name?.family || "Unknown"

  // Extract address components
  const patientAddress = patient.address?.[0]
  let address = null
  if (patientAddress) {
    address = {
      line1: patientAddress.line?.[0] || "",
      line2: patientAddress.line?.[1] || "",
      city: patientAddress.city || "",
      postcode: patientAddress.postalCode || ""
    }
  }

  return {
    nhsNumber,
    prefix,
    suffix,
    given,
    family,
    gender: patient.gender || null,
    dateOfBirth: patient.birthDate || null,
    address
  }
}

/**
 * Extracts prescribed items from FHIR MedicationRequest resources
 */
export const extractPrescribedItems = (medicationRequests: Array<MedicationRequest>) => {
  return medicationRequests.map(request => {
    const pendingCancellationExt = findExtensionByKey(request.extension, "PENDING_CANCELLATION")
    const dispensingInfoExt = findExtensionByKey(request.extension, "DISPENSING_INFORMATION")

    const epsStatusCode = getDisplayFromNestedExtension(dispensingInfoExt, "dispenseStatus") || request.status || "unknown"

    return {
      itemDetails: {
        medicationName: request.medicationCodeableConcept?.text ||
        request.medicationCodeableConcept?.coding?.[0]?.display || "Unknown",
        quantity: request.dispenseRequest?.quantity?.value?.toString() || "Unknown",
        dosageInstructions: request.dosageInstruction?.[0]?.text || "Unknown",
        epsStatusCode,
        nhsAppStatus: undefined, // Optional field
        itemPendingCancellation: getBooleanFromNestedExtension(pendingCancellationExt, "lineItemPendingCancellation"),
        cancellationReason: getDisplayFromNestedExtension(pendingCancellationExt, "cancellationReason")
      }
    }
  })
}
