import {
  SearchResponse,
  PatientDetails,
  PrescriptionSummary,
  TreatmentType
} from "../types"
import {
  Bundle,
  BundleEntry,
  RequestGroup,
  Patient,
  Extension
} from "fhir/r4"

export const mapSearchResponse = (
  patientDetails: PatientDetails,
  prescriptions: Array<PrescriptionSummary>
): SearchResponse => {
  return {
    patient: patientDetails,
    prescriptions: {
      current: prescriptions.filter(p => p.statusCode === "active"),
      future: prescriptions.filter(p => p.statusCode === "future"),
      claimedAndExpired: prescriptions.filter(p =>
        ["claimed", "expired"].includes(p.statusCode)
      )
    }
  }
}

/**
 * Extracts NHS number from Patient resource in the bundle
 */
export const extractNhsNumber = (bundle: Bundle): string => {
  const patientEntry = bundle.entry?.find(entry =>
    entry.resource?.resourceType === "Patient"
  ) as BundleEntry<Patient> | undefined

  return patientEntry?.resource?.identifier?.[0]?.value || ""
}

/**
   * Extracts value from a nested extension by URL
   */
export const findExtensionValue = (
  extensions: Array<Extension> | undefined, url: string
): boolean | string | number | undefined => {
  const extension = extensions?.find(ext => ext.url === url)
  if (!extension) return undefined

  // Handle nested extensions
  if (extension.extension) {
    return extension.extension[0]?.valueBoolean ??
             extension.extension[0]?.valueCoding?.code ??
             extension.extension[0]?.valueUnsignedInt
  }

  return undefined
}

/**
 * Determines prescription source based on ID format
 * @param prescriptionId Prescription ID to analyze
 * @returns Source location of the prescription
 */
export const determinePrescriptionSource = (prescriptionId: string): "England" | "Wales" | "Unknown" => {
  const firstTwoDigits = prescriptionId.substring(0, 2)
  if (firstTwoDigits.startsWith("01") || firstTwoDigits.startsWith("1")) {
    return "England"
  }
  if (firstTwoDigits.startsWith("02") || firstTwoDigits.startsWith("2")) {
    return "Wales"
  }
  return "Unknown"
}

/**
   * Maps FHIR Bundle to PrescriptionSummary objects
   */
export const mapResponseToPrescriptionSummary = (
  bundle: Bundle
): Array<PrescriptionSummary> => {
  // Extract NHS number from Patient resource
  const nhsNumber = extractNhsNumber(bundle)

  // Filter for RequestGroup entries and map them
  return bundle.entry
    ?.filter((entry): entry is BundleEntry<RequestGroup> =>
      entry.resource?.resourceType === "RequestGroup"
    )
    .map(entry => {
      const resource = entry.resource as RequestGroup

      // Get status from status extension
      const statusExtension = findExtensionValue(
        resource.extension,
        "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionStatusHistory"
      )

      // Get cancellation status from extensions
      const prescriptionPendingCancellation = findExtensionValue(
        resource.extension,
        // TODO: Update with correct URL once confirmed
        "pendingCancellation"
      ) ?? false

      const itemsPendingCancellation = findExtensionValue(
        resource.action?.[0]?.extension,
        // TODO: Update with correct URL once confirmed
        "pendingCancellation"
      ) ? 1 : 0

      // Map treatment type based on action properties
      const action = resource.action?.[0]
      let prescriptionTreatmentType: TreatmentType
      if (action?.cardinalityBehavior === "single") {
        prescriptionTreatmentType = TreatmentType.ACUTE
      } else if (action?.precheckBehavior === "yes") {
        prescriptionTreatmentType = TreatmentType.REPEAT
      } else {
        prescriptionTreatmentType = TreatmentType.REPEAT_DISPENSING
      }

      return {
        prescriptionId: resource.identifier?.[0]?.value || "",
        statusCode: statusExtension || resource.status || "",
        issueDate: action?.timingDateTime || "",
        prescriptionTreatmentType,
        prescriptionPendingCancellation,
        itemsPendingCancellation,
        prescribedFrom: determinePrescriptionSource(resource.identifier?.[0]?.value || ""),
        nhsNumber
      }
    }) || []
}
