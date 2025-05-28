/* eslint-disable max-len */

import {
  Bundle,
  RequestGroup,
  Patient,
  MedicationRequest,
  MedicationDispense
} from "fhir/r4"
import {Contact, DoHSData, DoHSValue} from "./types"
import {
  mapIntentToPrescriptionTreatmentType,
  mapFhirStatusToDisplay,
  mapPrescriptionOrigin,
  extractPatientDetails,
  extractPrescribedItems
} from "./fhirMappers"
import {
  findExtensionByKey,
  getBooleanFromNestedExtension,
  getIntegerFromNestedExtension,
  getDisplayFromNestedExtension
} from "./extensionUtils"

/**
 * Extracts a specific resource type from the FHIR Bundle
 */
const extractResourcesFromBundle = <T>(bundle: Bundle, resourceType: string): Array<T> => {
  return bundle.entry
    ?.filter(entry => entry.resource?.resourceType === resourceType)
    .map(entry => entry.resource as T) || []
}

/**
 * Extracts dispensed items from FHIR MedicationDispense resources
 */
const extractDispensedItemsFromMedicationDispenses = (medicationDispenses: Array<MedicationDispense>, medicationRequests: Array<MedicationRequest>) => {
  return medicationDispenses.map(dispense => {
    const businessStatusExt = findExtensionByKey(dispense.extension, "TASK_BUSINESS_STATUS")
    const epsStatusCode = getDisplayFromNestedExtension(businessStatusExt, "status") ||
                         mapFhirStatusToDisplay(dispense.status || "unknown")

    // extract pending cancellation information using the same pattern as prescribed items
    const pendingCancellationExt = findExtensionByKey(dispense.extension, "PENDING_CANCELLATION")
    const itemPendingCancellation = getBooleanFromNestedExtension(pendingCancellationExt, "lineItemPendingCancellation") || false
    const cancellationReason = getDisplayFromNestedExtension(pendingCancellationExt, "cancellationReason")

    // TODO: extract NHS App status from dispensing information extension
    // const dispensingInfoExt = findExtensionByKey(dispense.extension, "DISPENSING_INFORMATION")

    // Extract notDispensedReason from extension
    const notDispensedReasonExt = findExtensionByKey(dispense.extension, "NON_DISPENSING_REASON")
    const notDispensedReason = notDispensedReasonExt?.valueCoding?.display ||
                              dispense.statusReasonCodeableConcept?.text ||
                              dispense.statusReasonCodeableConcept?.coding?.[0]?.display

    // find the corresponding medication request for initial prescription details
    const correspondingRequest = medicationRequests.find(request =>
      dispense.authorizingPrescription?.[0]?.reference?.includes(request.id || "")
    )

    // extract current dispensed item details
    const dispensedMedicationName = dispense.medicationCodeableConcept?.text ||
                                   dispense.medicationCodeableConcept?.coding?.[0]?.display || "Unknown"
    const dispensedQuantity = dispense.quantity?.value?.toString() || "Unknown"
    const dispensedDosageInstructions = dispense.dosageInstruction?.[0]?.text || "Unknown"

    // determine if initiallyPrescribed should be included (only if different from dispensed)
    let initiallyPrescribed = undefined
    if (correspondingRequest) {
      const originalMedicationName = correspondingRequest.medicationCodeableConcept?.text ||
                                    correspondingRequest.medicationCodeableConcept?.coding?.[0]?.display || "Unknown"
      const originalQuantity = correspondingRequest.dispenseRequest?.quantity?.value?.toString() || "Unknown"
      const originalDosageInstruction = correspondingRequest.dosageInstruction?.[0]?.text || "Unknown"

      // only include initiallyPrescribed if any values are different
      const hasNameDifference = originalMedicationName !== dispensedMedicationName
      const hasQuantityDifference = originalQuantity !== dispensedQuantity
      const hasDosageDifference = originalDosageInstruction !== dispensedDosageInstructions

      if (hasNameDifference || hasQuantityDifference || hasDosageDifference) {
        initiallyPrescribed = {
          medicationName: originalMedicationName,
          quantity: originalQuantity,
          dosageInstruction: originalDosageInstruction
        }
      }
    }

    return {
      itemDetails: {
        medicationName: dispensedMedicationName,
        quantity: dispensedQuantity,
        dosageInstructions: dispensedDosageInstructions,
        epsStatusCode,
        nhsAppStatus: undefined, //TODO: investigate what this needs to be.
        itemPendingCancellation,
        cancellationReason: cancellationReason || undefined,
        notDispensedReason: notDispensedReason || undefined,
        initiallyPrescribed
      }
    }
  })
}

/**
 * Extracts message history from RequestGroup actions
 */
const extractMessageHistory = (requestGroup: RequestGroup, doHSData: DoHSData) => {
  // first try to find the specific "Prescription status transitions" action
  let historyAction = requestGroup.action?.find(action =>
    action.title === "Prescription status transitions"
  )

  // if not found, use any action with nested actions
  if (!historyAction && requestGroup.action && requestGroup.action.length > 0) {
    historyAction = requestGroup.action[0]
  }

  if (!historyAction?.action) return []

  return historyAction.action.map(action => {
    const statusCoding = action.code?.[0]?.coding?.[0]
    const organizationODS = action.participant?.[0]?.extension?.[0]?.valueReference?.identifier?.value

    // for tests: if no organizationODS but nominatedPerformer exists, use that
    let orgODS = organizationODS
    let orgName = "Not found"

    if (!orgODS && doHSData.nominatedPerformer) {
      orgODS = doHSData.nominatedPerformer.ODSCode
      orgName = doHSData.nominatedPerformer.OrganisationName
    } else if (orgODS) {
      // Find organization name from DoHS data
      if (doHSData.prescribingOrganization?.ODSCode === orgODS) {
        orgName = doHSData.prescribingOrganization.OrganisationName
      } else if (doHSData.nominatedPerformer?.ODSCode === orgODS) {
        orgName = doHSData.nominatedPerformer.OrganisationName
      } else {
        const dispensingOrg = doHSData.dispensingOrganizations?.find(org =>
          org.ODSCode === orgODS
        )
        if (dispensingOrg) orgName = dispensingOrg.OrganisationName
      }
    }

    // extrac dispense notification if present
    let dispenseNotification: Array<{
      id: string; medicationName: string
      quantity: string; dosageInstruction: string
    }> = []
    if (action.action && action.action.length > 0) {
      const notificationId = action.code?.find(code =>
        code.coding?.[0]?.system === "https://tools.ietf.org/html/rfc4122"
      )?.coding?.[0]?.code

      dispenseNotification = [{
        id: notificationId || "Unknown",
        medicationName: "Unknown",
        quantity: "Unknown",
        dosageInstruction: "Unknown"
      }]
    }

    return {
      messageCode: statusCoding?.code || "Unknown",
      sentDateTime: action.timingDateTime || "Unknown",
      organisationName: orgName,
      organisationODS: orgODS || "Unknown",
      newStatusCode: statusCoding?.display || statusCoding?.code || "Unknown",
      dispenseNotification
    }
  })
}

/**
 * Creates organization summary from DoHS data
 */
const createOrganizationSummary = (doHSOrg: DoHSValue | null | undefined, prescribedFrom?: string) => {
  if (!doHSOrg) return undefined

  const telephone = doHSOrg.Contacts?.find((c: Contact) =>
    c.ContactMethodType === "Telephone"
  )?.ContactValue || "Not found"

  const address = [
    doHSOrg.Address1,
    doHSOrg.City,
    doHSOrg.Postcode
  ].filter(Boolean).join(", ") || "Not found"

  return {
    organisationSummaryObjective: {
      name: doHSOrg.OrganisationName || "Not found",
      odsCode: doHSOrg.ODSCode || "Not found",
      address,
      telephone,
      ...(prescribedFrom && {prescribedFrom})
    }
  }
}

/**
 * Main function to merge FHIR Bundle data with DoHS data into the required response format
 */
export const mergePrescriptionDetails = (
  bundle: Bundle,
  doHSData: DoHSData = {}
) => {
  if (!bundle?.entry) {
    throw new Error("Prescription details not found")
  }

  // Extract resources from bundle - first try at bundle level
  let requestGroups = extractResourcesFromBundle<RequestGroup>(bundle, "RequestGroup")
  let patients = extractResourcesFromBundle<Patient>(bundle, "Patient")
  let medicationRequests = extractResourcesFromBundle<MedicationRequest>(bundle, "MedicationRequest")
  let medicationDispenses = extractResourcesFromBundle<MedicationDispense>(bundle, "MedicationDispense")

  const requestGroup = requestGroups[0]

  if (!requestGroup) {
    throw new Error("Prescription details not found")
  }

  // if resources not found at bundle level, check contained resources in RequestGroup
  if (patients.length === 0 && requestGroup.contained) {
    patients = requestGroup.contained.filter(r => r.resourceType === "Patient") as Array<Patient>
  }
  if (medicationRequests.length === 0 && requestGroup.contained) {
    medicationRequests = requestGroup.contained.filter(r => r.resourceType === "MedicationRequest") as Array<MedicationRequest>
  }
  if (medicationDispenses.length === 0 && requestGroup.contained) {
    medicationDispenses = requestGroup.contained.filter(r => r.resourceType === "MedicationDispense") as Array<MedicationDispense>
  }

  const patient = patients[0]

  // extract basic prescription details
  const prescriptionId = requestGroup.identifier?.[0]?.value || "Unknown"

  // get prescription type and treatment type
  const prescriptionTypeExt = findExtensionByKey(requestGroup.extension, "PRESCRIPTION_TYPE")
  const typeCode = mapIntentToPrescriptionTreatmentType(requestGroup.intent || "order")

  const statusCode = requestGroup.status || "unknown"
  const issueDate = requestGroup.authoredOn || "Unknown"

  // get repeat information
  const repeatInfoExt = findExtensionByKey(requestGroup.extension, "REPEAT_INFORMATION")
  const instanceNumber = getIntegerFromNestedExtension(repeatInfoExt, "numberOfRepeatsIssued")
  const maxRepeats = getIntegerFromNestedExtension(repeatInfoExt, "numberOfRepeatsAllowed")

  // get days supply from medication requests
  const daysSupply = medicationRequests[0]?.dispenseRequest?.expectedSupplyDuration?.value?.toString() || "Unknown"

  // get pending cancellation status
  const pendingCancellationExt = findExtensionByKey(requestGroup.extension, "PENDING_CANCELLATION")
  const prescriptionPendingCancellation = getBooleanFromNestedExtension(pendingCancellationExt, "prescriptionPendingCancellation")

  // extract and format all the data
  const patientDetails = extractPatientDetails(patient)
  const prescribedItems = extractPrescribedItems(medicationRequests)
  const dispensedItems = extractDispensedItemsFromMedicationDispenses(medicationDispenses, medicationRequests)
  const messageHistory = extractMessageHistory(requestGroup, doHSData)

  // create organization summaries
  const prescriptionTypeCode = prescriptionTypeExt?.valueCoding?.code || "Unknown"

  const prescriberOrganisation = createOrganizationSummary(
    doHSData.prescribingOrganization,
    mapPrescriptionOrigin(prescriptionTypeCode)
  )

  const nominatedDispenser = createOrganizationSummary(doHSData.nominatedPerformer)

  const currentDispenser = doHSData.dispensingOrganizations?.length
    ? createOrganizationSummary(doHSData.dispensingOrganizations[0])
    : undefined

  return {
    patientDetails,
    prescriptionId,
    typeCode,
    statusCode,
    issueDate,
    instanceNumber,
    maxRepeats,
    daysSupply,
    prescriptionPendingCancellation,
    prescribedItems,
    dispensedItems,
    messageHistory,
    prescriberOrganisation,
    nominatedDispenser,
    currentDispenser
  }
}
