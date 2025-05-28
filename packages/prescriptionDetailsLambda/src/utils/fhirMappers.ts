import {Patient, MedicationRequest, Coding} from "fhir/r4"
import {PrescriptionIntent} from "./types"
import {findExtensionByKey, getBooleanFromNestedExtension, getDisplayFromNestedExtension} from "./extensionUtils"

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
 * Maps FHIR status codes to user-friendly display values
 */
// TODO: Doxuble check if this is correct
export const mapFhirStatusToDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    "0001": "To be Dispensed",
    "0002": "With Dispenser",
    "0003": "Item dispensed - partial",
    "0006": "Dispensed",
    "0007": "Item to be dispensed",
    "0008": "With Dispenser - Active",
    "active": "Active",
    "completed": "Completed",
    "in-progress": "In Progress"
  }

  return statusMap[status] || status
}

/**
 * Maps course of therapy type codes to display values
 */
export const mapCourseOfTherapyType = (coding: Array<Coding> | undefined): string => {
  if (!coding || coding.length === 0) return "Unknown"

  const courseOfTherapyMap: Record<string, string> = {
    "acute": "Acute",
    "continuous": "Continuous",
    "continuous-repeating-dispensing": "Continuous Repeating Dispensing"
  }

  return courseOfTherapyMap[coding[0].code || ""] || coding[0].display || "Unknown"
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
export const extractPatientDetails = (patient: Patient | undefined) => {
  if (!patient) {
    return {
      identifier: "Unknown",
      name: {
        prefix: "",
        given: "Unknown",
        family: "Unknown",
        suffix: ""
      },
      gender: "Unknown",
      birthDate: "Unknown",
      address: {
        text: "Unknown",
        line: "Unknown",
        city: "Unknown",
        district: "Unknown",
        postalCode: "Unknown",
        type: "Unknown",
        use: "Unknown"
      }
    }
  }

  const address = patient.address?.[0]
  const name = patient.name?.[0]

  return {
    identifier: patient.identifier?.[0]?.value || "Unknown",
    name: {
      prefix: name?.prefix?.[0] || "",
      given: name?.given?.join(" ") || "Unknown",
      family: name?.family || "Unknown",
      suffix: name?.suffix?.[0] || ""
    },
    gender: patient.gender || "Unknown",
    birthDate: patient.birthDate || "Unknown",
    address: {
      text: address?.text || "Unknown",
      line: address?.line?.join(", ") || "Unknown",
      city: address?.city || "Unknown",
      district: address?.district || "Unknown",
      postalCode: address?.postalCode || "Unknown",
      type: address?.type || "Unknown",
      use: address?.use || "Unknown"
    }
  }
}

/**
 * Extracts prescribed items from FHIR MedicationRequest resources
 */
export const extractPrescribedItems = (medicationRequests: Array<MedicationRequest>) => {
  return medicationRequests.map(request => {
    const pendingCancellationExt = findExtensionByKey(request.extension, "PENDING_CANCELLATION")
    const dispensingInfoExt = findExtensionByKey(request.extension, "DISPENSING_INFORMATION")

    const epsStatusCode = getDisplayFromNestedExtension(dispensingInfoExt, "dispenseStatus") ||
                         mapFhirStatusToDisplay(request.status || "unknown")

    return {
      itemDetails: {
        medicationName: request.medicationCodeableConcept?.text || "Unknown",
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
