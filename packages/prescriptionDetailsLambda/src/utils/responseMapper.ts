/* eslint-disable max-len */

import {
  Bundle,
  FhirResource,
  RequestGroup,
  Patient,
  MedicationRequest,
  MedicationDispense
} from "fhir/r4"
import {DoHSData} from "./types"
import {
  mapPrescriptionOrigin,
  extractPatientDetails,
  mapMessageHistoryTitleToMessageCode,
  extractItems
} from "./fhirMappers"
import {findExtensionByKey, getBooleanFromNestedExtension, getIntegerFromNestedExtension} from "./extensionUtils"
import {
  MessageHistory,
  DispenseNotificationItem,
  OrgSummary,
  PrescriptionDetailsResponse
} from "@cpt-ui-common/common-types"
import {DoHSOrg} from "@cpt-ui-common/doHSClient"

/**
 * Extracts a specific resource type from the FHIR Bundle
 */
const extractResourcesFromBundle = <T extends FhirResource>(bundle: Bundle, resourceType: T["resourceType"]): Array<T> => {
  return bundle.entry!
    .filter(entry => entry.resource!.resourceType === resourceType)
    .map(entry => entry.resource as T)
}

/**
 * Extracts message history from RequestGroup actions
 */
const extractMessageHistory = (
  requestGroup: RequestGroup,
  doHSData: DoHSData,
  medicationRequests: Array<MedicationRequest>,
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

    const orgODS = action.participant![0].extension![0].valueReference!.identifier!.value!
    const messageCodeDisplayName = action.title!
    const messageCode = mapMessageHistoryTitleToMessageCode(messageCodeDisplayName)

    let orgName: string | undefined = undefined

    // Find organization name from DoHS data if ODS code is present
    if (doHSData.prescribingOrganization?.ODSCode === orgODS) {
      orgName = doHSData.prescribingOrganization.OrganisationName
    } else if (doHSData.nominatedPerformer?.ODSCode === orgODS) {
      orgName = doHSData.nominatedPerformer.OrganisationName
    } else if (doHSData.dispensingOrganization?.ODSCode === orgODS) {
      orgName = doHSData.dispensingOrganization.OrganisationName
    }

    let dispenseNotificationItems: Array<DispenseNotificationItem> | undefined

    // Only populate if this message type should have dispense notification
    if (messageCode === "dispense-notified" && action.action && action.action.length > 0) {
      // Iterate through all action items to collect all dispense notifications
      dispenseNotificationItems = medicationRequests.map(request => {
        let dispenses: Array<MedicationDispense> = []
        const requestId = request.id
        if (requestId && action.action) {
          dispenses = action.action.map(a => {
            const dispenseReference = a.resource?.reference
            if (!dispenseReference) return undefined

            return medicationDispenses.find(dispense =>
              dispense.id && dispenseReference.includes(dispense.id)
              && dispense.authorizingPrescription?.[0]?.reference?.includes(requestId)
            )
          }).filter(d => d !== undefined)
        }

        return {
          statusCode: dispenses[0]?.type?.coding?.[0].code ?? "unknown",
          components: dispenses.map(dispense => {
            const medicationName = dispense.medicationCodeableConcept?.text
            if (!medicationName) return undefined

            const quantityValue = dispense.quantity?.value?.toString() ?? ""
            const quantityUnit = dispense.quantity?.unit
            const quantity = quantityUnit ? `${quantityValue} ${quantityUnit}` : quantityValue
            return {
              medicationName,
              quantity,
              dosageInstruction: dispense.dosageInstruction?.[0]?.text
            }
          }).filter(c => c !== undefined)
        }
      })
    }

    return {
      messageCode,
      sentDateTime: action.timingDateTime!,
      orgName,
      orgODS,
      newStatusCode: statusCoding?.code ?? "Unknown",
      dispenseNotificationItems
    }
  })
}

/**
 * Creates organization summary from DoHS data
 */
const createOrganizationSummary = (
  doHSOrg: DoHSOrg | null | undefined,
  odsCodeFallback: string,
  prescribedFrom?: string
): OrgSummary => {
  // If we have an ODS code from either DoHS data or FHIR fallback, create a summary
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

/**
 * Extracts organization codes from FHIR Bundle as fallbacks
 */
const extractOrganizationCodes = (requestGroup: RequestGroup, firstMedicationRequest: MedicationRequest) => {
  // Get prescribing organization from RequestGroup author
  const prescribingODSCode = requestGroup.author!.identifier!.value!

  // Get nominated performer from first MedicationRequest
  const nominatedPerformerODSCode = firstMedicationRequest.dispenseRequest!.performer?.identifier!.value

  // Get dispensing organizations from message history
  let dispensingODSCode: string | undefined
  const historyAction = requestGroup.action?.find(action =>
    action.title === "Prescription status transitions"
  )

  if (historyAction?.action) {
    historyAction.action.forEach(action => {
      const orgODS = action.participant?.[0]?.extension?.[0]?.valueReference?.identifier?.value
      if (orgODS && dispensingODSCode !== (orgODS) && orgODS !== prescribingODSCode) {
        dispensingODSCode = orgODS
      }
    })
  }

  return {
    prescribingODSCode,
    nominatedPerformerODSCode,
    dispensingODSCode
  }
}

/**
 * Main function to merge FHIR Bundle data with DoHS data into the required response format
 */
export const mergePrescriptionDetails = (
  bundle: Bundle,
  doHSData: DoHSData = {}
): PrescriptionDetailsResponse => {
  // Extract resources from bundle
  const requestGroup = extractResourcesFromBundle<RequestGroup>(bundle, "RequestGroup")[0]
  const patient = extractResourcesFromBundle<Patient>(bundle, "Patient")[0]
  const medicationRequests = extractResourcesFromBundle<MedicationRequest>(bundle, "MedicationRequest")
  const firstMedicationRequest = medicationRequests[0]
  const medicationDispenses = extractResourcesFromBundle<MedicationDispense>(bundle, "MedicationDispense")

  // extract basic prescription details
  const prescriptionId = requestGroup.identifier![0].value!

  // get prescription type and treatment type
  const prescriptionTypeExt = findExtensionByKey(requestGroup.extension, "PRESCRIPTION_TYPE")
  const typeCode = firstMedicationRequest.courseOfTherapyType!.coding![0].code! as PrescriptionDetailsResponse["typeCode"]

  const issueDate = requestGroup.authoredOn!

  // get repeat information
  const repeatInfoExt = findExtensionByKey(requestGroup.extension, "REPEAT_INFORMATION")
  const instanceNumber = getIntegerFromNestedExtension(repeatInfoExt, "numberOfRepeatsIssued", 1)
  const maxRepeats = getIntegerFromNestedExtension(repeatInfoExt, "numberOfRepeatsAllowed")

  // get days supply from RequestGroup timing information
  const lineItemsAction = requestGroup.action!.filter(action =>
    action.title === "Prescription Line Items(Medications)"
  )[0]
  const daysSupply = lineItemsAction.timingTiming?.repeat!.period!.toString() ?? "Not applicable"

  // get pending cancellation status
  const pendingCancellationExt = findExtensionByKey(requestGroup.extension, "PENDING_CANCELLATION")
  const prescriptionPendingCancellation = getBooleanFromNestedExtension(pendingCancellationExt, "prescriptionPendingCancellation")

  // extract and format all the data
  const patientDetails = extractPatientDetails(patient)
  const items = extractItems(medicationRequests, medicationDispenses)
  const messageHistory = extractMessageHistory(requestGroup, doHSData, medicationRequests, medicationDispenses)

  // TODO: extract NHS App status from dispensing information extension
  // const dispensingInfoExt = findExtensionByKey(dispense.extension, "DISPENSING_INFORMATION")

  const statusCode = messageHistory.length > 0
    ? messageHistory[messageHistory.length - 1].newStatusCode
    : requestGroup.status ?? "unknown"

  // Extract organization codes from FHIR as fallbacks
  const {
    prescribingODSCode,
    nominatedPerformerODSCode,
    dispensingODSCode
  } = extractOrganizationCodes(requestGroup, firstMedicationRequest)

  // create organization summaries
  const prescriptionTypeCode = prescriptionTypeExt?.valueCoding?.code ?? "Unknown"

  const prescriberOrg = createOrganizationSummary(
    doHSData.prescribingOrganization,
    prescribingODSCode,
    mapPrescriptionOrigin(prescriptionTypeCode)
  )

  const nominatedDispenser = nominatedPerformerODSCode
    ? createOrganizationSummary(doHSData.nominatedPerformer, nominatedPerformerODSCode)
    : undefined

  const currentDispenser = dispensingODSCode
    ? createOrganizationSummary(doHSData.dispensingOrganization, dispensingODSCode)
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
    items,
    messageHistory,
    prescriberOrg,
    nominatedDispenser,
    currentDispenser
  }
}
