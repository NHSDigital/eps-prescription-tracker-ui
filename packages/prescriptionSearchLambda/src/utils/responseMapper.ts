import {
  SearchResponse,
  PatientDetails,
  TreatmentType,
  PDSResponse,
  IntentMap,
  PrescriptionStatus,
  PrescriptionAPIResponse,
  PrescriptionStatusCategories,
  STATUS_CATEGORY_MAP
} from "../types"
import {
  Bundle,
  BundleEntry,
  RequestGroup,
  Patient,
  Extension
} from "fhir/r4"

/**
 * Extract patient details from RequestGroup if PDS data is incomplete
 */
const extractFallbackPatientDetails = (prescriptions: Array<PrescriptionAPIResponse>): PatientDetails => {
  if (!prescriptions || prescriptions.length === 0) {
    // Return complete PatientDetails with default values
    return {
      nhsNumber: "",
      given: "",
      family: "",
      prefix: "",
      suffix: "",
      gender: null,
      dateOfBirth: null,
      address: null
    }
  }

  // Get the first prescription's data
  const firstPrescription = prescriptions[0]

  // Return complete PatientDetails with fallback values
  return {
    nhsNumber: firstPrescription.nhsNumber?.toString() || "",
    given: firstPrescription.nhsNumber?.toString() || "", // Using NHS number as fallback for given name
    family: "",
    prefix: "",
    suffix: "",
    gender: null,
    dateOfBirth: null,
    address: null
  }
}

export const createMinimalPatientDetails = (): PatientDetails => ({
  nhsNumber: "",
  given: "",
  family: "",
  prefix: "",
  suffix: "",
  gender: null,
  dateOfBirth: null,
  address: null
})

/**
 * Determines if patient details need fallback data
 * - Returns true if PDS error occurred (indicating PDS data is unavailable/incomplete)
 * - Returns true if essential fields are missing from PDS response
 */
const needsFallbackData = (details: PatientDetails): boolean => {
  // If there's a PDSError, we definitely need fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((details as any)._pdsError) {
    return true
  }

  // Otherwise check for missing essential fields
  return !details.given || !details.nhsNumber
}

/**
   * Maps patient details and prescriptions to search response format
   * Includes fallback logic for incomplete PDS data
   */
export const mapSearchResponse = (
  patientDetails: PatientDetails,
  prescriptions: Array<PrescriptionAPIResponse>
): SearchResponse => {
  const finalPatientDetails = needsFallbackData(patientDetails) && prescriptions.length > 0
    ? extractFallbackPatientDetails(prescriptions)
    : patientDetails

  return {
    patient: finalPatientDetails,
    currentPrescriptions: prescriptions.filter(p =>
      STATUS_CATEGORY_MAP[p.statusCode as PrescriptionStatus] === PrescriptionStatusCategories.CURRENT),
    futurePrescriptions: prescriptions.filter(p =>
      STATUS_CATEGORY_MAP[p.statusCode as PrescriptionStatus] === PrescriptionStatusCategories.FUTURE),
    pastPrescriptions: prescriptions.filter(p => {
      const category = STATUS_CATEGORY_MAP[p.statusCode as PrescriptionStatus]
      return category === PrescriptionStatusCategories.PAST
    })
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
 * Maps PDS response to patient details without any fallback logic
 */
export const mapPdsResponseToPatientDetails = (pdsData: PDSResponse): PatientDetails => {
  return {
    nhsNumber: pdsData.id || "",
    given: pdsData.name?.[0]?.given?.[0] || "",
    family: pdsData.name?.[0]?.family || "",
    prefix: pdsData.name?.[0]?.prefix?.[0] || "",
    suffix: pdsData.name?.[0]?.suffix?.[0] || "",
    gender: pdsData.gender || null,
    dateOfBirth: pdsData.birthDate || null,
    address: pdsData.address?.[0] ? {
      line1: pdsData.address[0].line?.[0],
      line2: pdsData.address[0].line?.[1],
      city: pdsData.address[0].city,
      postcode: pdsData.address[0].postalCode
    } : null
  }
}

// Helper to extract NHS number from RequestGroup.subject
export const extractSubjectReference = (bundle: Bundle): string | undefined => {
  const requestGroup = bundle.entry?.find(entry =>
    entry.resource?.resourceType === "RequestGroup"
  )?.resource as RequestGroup

  const subjectReference = requestGroup?.subject?.reference
  if (subjectReference) {
    // Extract NHS number from reference format "Patient/1234567890"
    return subjectReference.split("/")[1]
  }
  return undefined
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

const intentMap: IntentMap = {
  [TreatmentType.ACUTE]: "order",
  [TreatmentType.REPEAT]: "instance-order",
  [TreatmentType.ERD] : "reflex-order"
}

/**
   * Maps FHIR Bundle to PrescriptionSummary objects
   */
export const mapResponseToPrescriptionSummary = (
  bundle: Bundle
): Array<PrescriptionAPIResponse> => {
  const nhsNumber = Number(extractNhsNumber(bundle))

  return bundle.entry
    ?.filter((entry): entry is BundleEntry<RequestGroup> =>
      entry.resource?.resourceType === "RequestGroup"
    )
    .map(entry => {
      const resource = entry.resource as RequestGroup

      // Extract status code - fixed to match the structure
      const statusExtension = resource.extension?.find(ext =>
        ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionStatusHistory"
      )
      const statusCode = statusExtension?.extension?.find(ext =>
        ext.url === "status"
      )?.valueCoding?.code || ""

      // Get treatment type from intent
      const treatmentType = Object.entries(intentMap)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .find(([_, value]) => value === resource.intent)?.[0] as TreatmentType || TreatmentType.ACUTE

      // Get repeat information
      const repeatInfo = resource.extension?.find(ext =>
        ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation"
      )
      const maxRepeats = repeatInfo?.extension?.find(ext =>
        ext.url === "numberOfRepeatsAllowed"
      )?.valueInteger
      const issueNumber = repeatInfo?.extension?.find(ext =>
        ext.url === "numberOfRepeatsIssued"
      )?.valueInteger

      // Extract pending cancellation - fixed to match the structure
      const pendingCancellationExt = resource.extension?.find(ext =>
        ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PendingCancellation"
      )

      const prescriptionPendingCancellation = pendingCancellationExt?.extension?.find(ext =>
        ext.url === "prescriptionPendingCancellation"
      )?.valueBoolean || false

      const itemsPendingCancellation = pendingCancellationExt?.extension?.find(ext =>
        ext.url === "lineItemPendingCancellation"
      )?.valueBoolean || false

      return {
        prescriptionId: resource.identifier?.[0]?.value || "",
        statusCode,
        issueDate: resource.authoredOn || "",
        prescriptionTreatmentType: treatmentType,
        prescriptionPendingCancellation,
        itemsPendingCancellation,
        maxRepeats,
        issueNumber,
        nhsNumber
      }
    }) || []
}
