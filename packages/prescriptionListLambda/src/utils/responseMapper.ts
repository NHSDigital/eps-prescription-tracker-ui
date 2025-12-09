import {
  SearchResponse,
  TreatmentType,
  PrescriptionAPIResponse,
  PrescriptionStatus,
  PrescriptionStatusCategories,
  PatientSummary
} from "@cpt-ui-common/common-types"
import {IntentMap, STATUS_CATEGORY_MAP} from "./types"

import {Bundle, RequestGroup} from "fhir/r4"

/*
  * Maps patient details and prescriptions to search response format
  * Includes fallback logic for incomplete PDS data
*/
export const mapSearchResponse = (
  patientDetails: PatientSummary | undefined,
  prescriptions: Array<PrescriptionAPIResponse>
): SearchResponse => {

  /* only fall back to details from the first prescription if we fail to get response from PDS */
  let patient = patientDetails
  let patientFallback = false
  if (!patient && prescriptions.length > 0){
    patientFallback = true
    patient = {
      nhsNumber:  prescriptions[0].nhsNumber,
      gender: undefined,
      dateOfBirth: undefined,
      familyName:  prescriptions[0]?.family,
      givenName:  prescriptions[0].given ? prescriptions[0].given: undefined,
      address: undefined,
      postcode: undefined
    }
  }

  const sortedPrescriptions: Record<PrescriptionStatusCategories, Array<PrescriptionAPIResponse>> = {
    [PrescriptionStatusCategories.CURRENT]: [],
    [PrescriptionStatusCategories.FUTURE]: [],
    [PrescriptionStatusCategories.PAST]: []
  }

  for (const prescription of prescriptions) {
    sortedPrescriptions[STATUS_CATEGORY_MAP[prescription.statusCode as PrescriptionStatus]].push(prescription)
  }

  return {
    patient,
    patientFallback,
    currentPrescriptions: sortedPrescriptions.active,
    futurePrescriptions: sortedPrescriptions.future,
    pastPrescriptions: sortedPrescriptions.past
  }
}

const intentMap: IntentMap = {
  [TreatmentType.ACUTE]: "order",
  [TreatmentType.REPEAT]: "instance-order",
  [TreatmentType.ERD] : "reflex-order"
}

/*
  * Maps FHIR Bundle to PrescriptionSummary objects
*/
export const mapResponseToPrescriptionSummary = (
  bundle: Bundle
): Array<PrescriptionAPIResponse> => {
  if (!bundle.entry){
    return []
  }

  let nhsNumber: string = ""
  let given: Array<string> | undefined
  let family: string | undefined
  let prefix: Array<string> | undefined
  let suffix: Array<string> | undefined
  const prescriptions: Array<PrescriptionAPIResponse> = []

  for (const entry of bundle.entry){
    /* Parse the Patient resource */
    if (entry.resource?.resourceType === "Patient"){
      nhsNumber = entry?.resource?.identifier?.[0]?.value as string
      given = entry?.resource?.name?.[0].given
      family = entry?.resource?.name?.[0].family
      prefix = entry?.resource?.name?.[0].prefix
      suffix = entry?.resource?.name?.[0].suffix
      continue
    }

    const resource = entry.resource as RequestGroup

    // Extract status. Is either 'completed' when deleted, or 'active'
    const isDeleted = resource.status === "completed"

    /* TODO: can/should this logic be refactored to a single loop to remove the need to keep iterating through
      the same arrays with multiple finds? */

    // Extract status code - fixed to match the structure
    const statusExtension = resource.extension?.find(ext =>
      ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PrescriptionStatusHistory"
    )
    const statusCode = statusExtension?.extension?.find(ext =>
      ext.url === "status"
    )?.valueCoding?.code as string

    // Get treatment type from intent
    const treatmentType = Object.entries(intentMap)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .find(([_, value]) => value === resource.intent)?.[0] as TreatmentType

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
      ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation"
    )

    const prescriptionPendingCancellation = pendingCancellationExt?.extension?.find(ext =>
      ext.url === "prescriptionPendingCancellation"
    )?.valueBoolean || false

    const itemsPendingCancellation = pendingCancellationExt?.extension?.find(ext =>
      ext.url === "lineItemPendingCancellation"
    )?.valueBoolean || false

    prescriptions.push({
      prescriptionId: resource.identifier?.[0]?.value as string,
      isDeleted,
      statusCode,
      issueDate: resource.authoredOn as string,
      prescriptionTreatmentType: treatmentType,
      prescriptionPendingCancellation,
      itemsPendingCancellation,
      maxRepeats,
      issueNumber,
      nhsNumber,
      given,
      family,
      prefix,
      suffix
    })
  }
  return prescriptions
}
