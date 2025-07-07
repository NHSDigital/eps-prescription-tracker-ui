/* eslint-disable max-len */

import {
  Bundle,
  RequestGroup,
  Patient,
  MedicationRequest,
  MedicationDispense
} from "fhir/r4"
import {DoHSData} from "./types"
import {
  mapPrescriptionOrigin,
  extractPatientDetails,
  extractPrescribedItems,
  mapMessageHistoryTitleToMessageCode,
  mapCourseOfTherapyType
} from "./fhirMappers"
import {
  findExtensionByKey,
  getBooleanFromNestedExtension,
  getCodeFromNestedExtension,
  getIntegerFromNestedExtension
} from "./extensionUtils"
import {MessageHistory, OrganisationSummary} from "@cpt-ui-common/common-types"
import {DoHSOrg} from "@cpt-ui-common/doHSClient"
import {Logger} from "@aws-lambda-powertools/logger"

/**
 * Extracts a specific resource type from the FHIR Bundle
 */
const extractResourcesFromBundle = <T>(bundle: Bundle, resourceType: string): Array<T> => {
  return bundle.entry
    ?.filter(entry => entry.resource?.resourceType === resourceType)
    .map(entry => entry.resource as T) ?? []
}

/**
 * Extracts dispensed items from FHIR MedicationDispense resources
 */
const extractDispensedItemsFromMedicationDispenses = (
  medicationDispenses: Array<MedicationDispense>,
  medicationRequests: Array<MedicationRequest>,
  logger: Logger
): Array<{
    medicationName: string
    quantity: string
    dosageInstructions: string
    epsStatusCode: string
    nhsAppStatus: undefined
    itemPendingCancellation: boolean
    cancellationReason: string | null
    notDispensedReason: string | undefined
    initiallyPrescribed: {
      medicationName: string
      quantity: string
      dosageInstructions: string
    } | undefined
}> => {
  return medicationDispenses
    .map(dispense => {
      const epsStatusCode = dispense?.type?.coding?.[0].code ?? "unknown"
      return {dispense, epsStatusCode}
    })
    .filter(({dispense, epsStatusCode}) => dispense.status === "in-progress" && ["0001", "0002", "0003"].includes(epsStatusCode))
    .map(({dispense, epsStatusCode}) => {
      // Extract notDispensedReason from extension
      const notDispensedReasonExt = findExtensionByKey(dispense.extension, "NON_DISPENSING_REASON")
      const notDispensedReason = notDispensedReasonExt?.valueCoding?.display ??
                              dispense.statusReasonCodeableConcept?.text ??
                              dispense.statusReasonCodeableConcept?.coding?.[0]?.display

      // find the corresponding medication request for initial prescription details and cancellation info
      const correspondingRequestIndex = medicationRequests.findIndex(request =>
        request.id && dispense.authorizingPrescription?.[0]?.reference?.includes(request.id)
      )

      // extract pending cancellation information from the corresponding MedicationRequest
      let itemPendingCancellation = false
      let cancellationReason = null
      let dispensedDosageInstructions = "Unknown"

      // extract current dispensed item details
      const dispensedMedicationName = dispense.medicationCodeableConcept?.text ??
                                   dispense.medicationCodeableConcept?.coding?.[0]?.display ?? "Unknown"
      const dispensedQuantityValue = dispense.quantity?.value?.toString() ?? "Unknown"
      const dispensedQuantityUnit = dispense.quantity?.unit ?? ""
      const dispensedQuantity = dispensedQuantityUnit ? `${dispensedQuantityValue} ${dispensedQuantityUnit}` : dispensedQuantityValue

      // determine if initiallyPrescribed should be included (only if different from dispensed)
      let initiallyPrescribed = undefined

      if (correspondingRequestIndex >= 0) {
        const correspondingRequest = medicationRequests[correspondingRequestIndex]
        const pendingCancellationExt = findExtensionByKey(correspondingRequest.extension, "PENDING_CANCELLATION")
        itemPendingCancellation = getBooleanFromNestedExtension(pendingCancellationExt, "lineItemPendingCancellation") ?? false
        cancellationReason = correspondingRequest.statusReason?.text ??
        correspondingRequest.statusReason?.coding?.[0]?.display ??
        null

        const businessStatusExt = findExtensionByKey(correspondingRequest.extension, "DISPENSING_INFORMATION")
        const prescriptionStatusCode = getCodeFromNestedExtension(businessStatusExt, "dispenseStatus") ?? "unknown"

        if(prescriptionStatusCode !== epsStatusCode){
          logger.warn("Warning: MedicationResponse statusCode differs from MedicationRequest")
          epsStatusCode = prescriptionStatusCode
        }

        // Get dosage instructions from the corresponding MedicationRequest since MedicationDispense doesn't have them
        // dispensedDosageInstructions = correspondingRequest.dosageInstruction?.[0]?.text ?? "Unknown"

        const originalMedicationName = correspondingRequest.medicationCodeableConcept?.text ??
                                    correspondingRequest.medicationCodeableConcept?.coding?.[0]?.display ?? "Unknown"
        const originalQuantityValue = correspondingRequest.dispenseRequest?.quantity?.value?.toString() ?? "Unknown"
        const originalQuantityUnit = correspondingRequest.dispenseRequest?.quantity?.unit ?? ""
        const originalQuantity = originalQuantityUnit ? `${originalQuantityValue} ${originalQuantityUnit}` : originalQuantityValue
        const originalDosageInstruction = correspondingRequest.dosageInstruction?.[0]?.text ?? "Unknown"

        // only include initiallyPrescribed if any values are different
        const hasNameDifference = originalMedicationName !== dispensedMedicationName
        const hasQuantityDifference = originalQuantity !== dispensedQuantity
        const hasDosageDifference = originalDosageInstruction !== dispensedDosageInstructions

        if (hasNameDifference || hasQuantityDifference || hasDosageDifference) {
          initiallyPrescribed = {
            medicationName: originalMedicationName,
            quantity: originalQuantity,
            dosageInstructions: originalDosageInstruction
          }
        }

        medicationRequests.splice(correspondingRequestIndex, 1)

      }

      return {
        medicationName: dispensedMedicationName,
        quantity: dispensedQuantity,
        dosageInstructions: dispensedDosageInstructions,
        epsStatusCode,
        nhsAppStatus: undefined, //TODO: investigate what this needs to be.
        itemPendingCancellation,
        cancellationReason,
        notDispensedReason: notDispensedReason ?? undefined,
        initiallyPrescribed
      }
    })
}

/**
 * Extracts message history from RequestGroup actions
 */
const extractMessageHistory = (
  requestGroup: RequestGroup,
  doHSData: DoHSData,
  medicationDispenses: Array<MedicationDispense>
): Array<MessageHistory> => {
  // find the specific "Prescription status transitions" action
  const historyAction = requestGroup.action?.find(action =>
    action.title === "Prescription status transitions"
  )

  if (!historyAction?.action) return []

  return historyAction.action.map(action => {
    // Find the status coding with the EPS task business status system
    const statusCoding = action.code?.find(code =>
      code.coding?.some(coding => coding.system === "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status")
    )?.coding?.find(coding => coding.system === "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status")

    const organizationODS = action.participant?.[0]?.extension?.[0]?.valueReference?.identifier?.value
    const messageCodeDisplayName = action.title
    const messageCode = mapMessageHistoryTitleToMessageCode(messageCodeDisplayName ?? "")

    let orgName: string | undefined = undefined

    // Find organization name from DoHS data if ODS code is present
    if (organizationODS) {
      if (doHSData.prescribingOrganization?.ODSCode === organizationODS) {
        orgName = doHSData.prescribingOrganization.OrganisationName
      } else if (doHSData.nominatedPerformer?.ODSCode === organizationODS) {
        orgName = doHSData.nominatedPerformer.OrganisationName
      } else if (doHSData.dispensingOrganization?.ODSCode === organizationODS) {
        orgName = doHSData.dispensingOrganization.OrganisationName
      }
    }

    const dispenseNotifications: Array<{
      id: string
      medicationName: string
      quantity: string
      dosageInstruction: string
      statusCode: string
    }> = []

    // Only populate if this message type should have dispense notification
    if (messageCode === "dispense-notified" && action.action && action.action.length > 0) {
      const notificationId = action.code?.find(code =>
        code.coding?.[0]?.system === "https://tools.ietf.org/html/rfc4122"
      )?.coding?.[0]?.code

      // Iterate through all action items to collect all dispense notifications
      action.action.forEach(subAction => {
        const dispenseReference = subAction.resource?.reference
        if (dispenseReference) {
          // Find the referenced MedicationDispense resource
          const referencedDispense = medicationDispenses.find(dispense =>
            dispenseReference.includes(dispense.id ?? "")
          )

          if (notificationId && referencedDispense) {
            const dispensedQuantityValue = referencedDispense.quantity?.value?.toString() ?? ""
            const dispensedQuantityUnit = referencedDispense.quantity?.unit ?? ""
            const dispensedQuantity = dispensedQuantityUnit ? `${dispensedQuantityValue} ${dispensedQuantityUnit}` : dispensedQuantityValue
            const statusCode = referencedDispense?.type?.coding?.[0].code ?? "unknown"

            dispenseNotifications.push({
              id: notificationId,
              medicationName: referencedDispense.medicationCodeableConcept?.text ??
                             referencedDispense.medicationCodeableConcept?.coding?.[0]?.display ?? "",
              quantity: dispensedQuantity,
              dosageInstruction: referencedDispense.dosageInstruction?.[0]?.text ?? "",
              statusCode
            })
          }
        }
      })
    }

    return {
      messageCode: messageCode ?? "Unknown",
      sentDateTime: action.timingDateTime ?? "Unknown",
      organisationName: orgName,
      organisationODS: organizationODS ?? "Unknown",
      newStatusCode: statusCoding?.code ?? "Unknown",
      dispenseNotification: dispenseNotifications
    }
  })
}

/**
 * Creates organization summary from DoHS data
 */
const createOrganizationSummary = (
  doHSOrg: DoHSOrg | null | undefined,
  prescribedFrom?: string,
  odsCodeFallback?: string
): OrganisationSummary | undefined => {
  // If we have an ODS code from either DoHS data or FHIR fallback, create a summary
  if (doHSOrg || odsCodeFallback) {
    const telephone = doHSOrg?.Contacts?.find(c =>
      c.ContactMethodType === "Telephone"
    )?.ContactValue ?? "Not found"

    const address = [
      doHSOrg?.Address1,
      doHSOrg?.City,
      doHSOrg?.Postcode
    ].filter(Boolean).join(", ") || "Not found"

    return {
      name: doHSOrg?.OrganisationName ?? "",
      odsCode: doHSOrg?.ODSCode ?? odsCodeFallback ?? "Not found",
      address,
      telephone,
      ...(prescribedFrom && {prescribedFrom})
    }
  }

  return undefined
}

/**
 * Extracts organization codes from FHIR Bundle as fallbacks
 */
const extractOrganizationCodes = (
  requestGroup: RequestGroup,
  medicationRequests: Array<MedicationRequest>
) => {
  // Get prescribing organization from RequestGroup author
  const prescribingODSCode = requestGroup.author?.identifier?.value

  // Get nominated performer from first MedicationRequest
  const nominatedPerformerODSCode = medicationRequests[0]?.dispenseRequest?.performer?.identifier?.value

  // Get dispensing organizations from message history
  let dispensingODSCodes: string | undefined
  const historyAction = requestGroup.action?.find(action =>
    action.title === "Prescription status transitions"
  )

  if (historyAction?.action) {
    historyAction.action.forEach(action => {
      const orgODS = action.participant?.[0]?.extension?.[0]?.valueReference?.identifier?.value
      if (orgODS && dispensingODSCodes !== (orgODS) && orgODS !== prescribingODSCode) {
        dispensingODSCodes = orgODS
      }
    })
  }

  return {
    prescribingODSCode,
    nominatedPerformerODSCode,
    dispensingODSCodes
  }
}

/**
 * Main function to merge FHIR Bundle data with DoHS data into the required response format
 */
export const mergePrescriptionDetails = (
  bundle: Bundle,
  doHSData: DoHSData = {},
  logger: Logger
) => {
  if (!bundle?.entry) {
    throw new Error("Prescription bundle contained no entries")
  }

  // Extract resources from bundle
  const requestGroups = extractResourcesFromBundle<RequestGroup>(bundle, "RequestGroup")
  const patients = extractResourcesFromBundle<Patient>(bundle, "Patient")
  const medicationRequests = extractResourcesFromBundle<MedicationRequest>(bundle, "MedicationRequest")
  const medicationDispenses = extractResourcesFromBundle<MedicationDispense>(bundle, "MedicationDispense")

  const requestGroup = requestGroups[0]

  if (!requestGroup) {
    throw new Error("Prescription details not found")
  }

  const patient = patients[0]

  // extract basic prescription details
  const prescriptionId = requestGroup.identifier?.[0]?.value ?? "Unknown"

  // get prescription type and treatment type
  const prescriptionTypeExt = findExtensionByKey(requestGroup.extension, "PRESCRIPTION_TYPE")
  const typeCode = mapCourseOfTherapyType(medicationRequests[0]?.courseOfTherapyType?.coding)

  const issueDate = requestGroup.authoredOn ?? "Unknown"

  // get repeat information
  const repeatInfoExt = findExtensionByKey(requestGroup.extension, "REPEAT_INFORMATION")
  const instanceNumber = getIntegerFromNestedExtension(repeatInfoExt, "numberOfRepeatsIssued", 1)
  const maxRepeats = getIntegerFromNestedExtension(repeatInfoExt, "numberOfRepeatsAllowed", 0)

  // get days supply from RequestGroup timing information
  const lineItemsAction = requestGroup.action?.find(action =>
    action.title === "Prescription Line Items(Medications)"
  )
  const daysSupply = lineItemsAction?.timingTiming?.repeat?.period?.toString() ?? "Unknown"

  // get pending cancellation status
  const pendingCancellationExt = findExtensionByKey(requestGroup.extension, "PENDING_CANCELLATION")
  const prescriptionPendingCancellation = getBooleanFromNestedExtension(pendingCancellationExt, "prescriptionPendingCancellation")

  // extract and format all the data
  const patientDetails = extractPatientDetails(patient)
  const dispensedItems = extractDispensedItemsFromMedicationDispenses(medicationDispenses, medicationRequests, logger)
  const prescribedItems = extractPrescribedItems(medicationRequests)
  const messageHistory = extractMessageHistory(requestGroup, doHSData, medicationDispenses)

  // TODO: extract NHS App status from dispensing information extension
  // const dispensingInfoExt = findExtensionByKey(dispense.extension, "DISPENSING_INFORMATION")

  const statusCode = messageHistory.length > 0
    ? messageHistory[messageHistory.length - 1].newStatusCode
    : requestGroup.status ?? "unknown"

  // Extract organization codes from FHIR as fallbacks
  const {
    prescribingODSCode,
    nominatedPerformerODSCode,
    dispensingODSCodes
  } = extractOrganizationCodes(requestGroup, medicationRequests)

  // create organization summaries
  const prescriptionTypeCode = prescriptionTypeExt?.valueCoding?.code ?? "Unknown"

  const prescriberOrganisation = createOrganizationSummary(
    doHSData.prescribingOrganization,
    mapPrescriptionOrigin(prescriptionTypeCode),
    prescribingODSCode
  )

  const nominatedDispenser = createOrganizationSummary(
    doHSData.nominatedPerformer,
    undefined,
    nominatedPerformerODSCode
  )

  const currentDispenser = createOrganizationSummary(doHSData.dispensingOrganization, undefined, dispensingODSCodes)

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
