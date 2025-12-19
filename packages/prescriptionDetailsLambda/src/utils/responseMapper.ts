import {
  Bundle,
  FhirResource,
  RequestGroup,
  Patient,
  MedicationRequest,
  MedicationDispense,
  RequestGroupAction
} from "fhir/r4"
import {DoHSData} from "./types"
import {mapPrescriptionOrigin, mapMessageHistoryTitleToMessageCode, extractItems} from "./fhirMappers"
import {
  findExtensionByKey,
  findExtensionsByKey,
  getBooleanFromNestedExtension,
  getIntegerFromNestedExtension,
  PrescriptionOdsCodes
} from "./extensionUtils"
import {
  MessageHistory,
  DispenseNotificationItem,
  OrgSummary,
  PrescriptionDetailsResponse,
  PatientSummary
} from "@cpt-ui-common/common-types"
import {DoHSOrg} from "@cpt-ui-common/doHSClient"
import {Logger} from "@aws-lambda-powertools/logger"

/**
 * Extracts a specific resource type from the FHIR Bundle
 */
const extractResourcesFromBundle = <T extends FhirResource>(
  bundle: Bundle,
  resourceType: T["resourceType"]
): Array<T> => {
  return bundle.entry!
    .filter(entry => entry.resource!.resourceType === resourceType)
    .map(entry => entry.resource as T)
}

const extractDispenseNotificationItem = (
  request: MedicationRequest,
  action: RequestGroupAction,
  medicationDispenses: Array<MedicationDispense>
) => {
  let dispenses: Array<MedicationDispense> = []
  const requestId = request.id
  if (requestId && action.action) {
    dispenses = action.action.map(action => {
      const dispenseReference = action.resource?.reference
      if (!dispenseReference) return undefined

      return medicationDispenses.find(dispense =>
        dispense.id && dispenseReference.includes(dispense.id)
              && dispense.authorizingPrescription?.[0]?.reference?.includes(requestId)
      )
    }).filter(dispense => dispense !== undefined)
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
}

/**
 * Extracts message history from RequestGroup actions
 */
const extractMessageHistory = (
  requestGroup: RequestGroup,
  doHSData: DoHSData,
  medicationRequests: Array<MedicationRequest>,
  medicationDispenses: Array<MedicationDispense>,
  logger?: Logger
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
    const messageCode = mapMessageHistoryTitleToMessageCode(messageCodeDisplayName, logger)

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
      dispenseNotificationItems = medicationRequests.map(request => {
        return extractDispenseNotificationItem(request, action, medicationDispenses)
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
 * Main function to merge FHIR Bundle data with DoHS data into the required response format
 */
export const mergePrescriptionDetails = (
  bundle: Bundle,
  doHSData: DoHSData,
  {
    prescribingOrganization,
    nominatedPerformer,
    dispensingOrganization
  }: PrescriptionOdsCodes,
  logger?: Logger
): PrescriptionDetailsResponse => {

  // TODO: This needs refactoring to remove unnecessary iterations through the same arrays
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
  const typeCode = firstMedicationRequest
    .courseOfTherapyType!
    .coding![0]
    .code! as PrescriptionDetailsResponse["typeCode"]

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
  const prescriptionPendingCancellation = getBooleanFromNestedExtension(
    findExtensionByKey(requestGroup.extension, "PENDING_CANCELLATION"),
    "prescriptionPendingCancellation"
  )

  // extract and format all the data
  const patientDetails: PatientSummary = {
    nhsNumber: patient?.identifier?.[0].value as string,
    gender: patient?.gender,
    dateOfBirth: patient?.birthDate,
    familyName: patient?.name?.[0].family,
    givenName: patient?.name?.[0].given,
    address: patient?.address?.[0].line,
    postcode: patient?.address?.[0].postalCode
  }
  const items = extractItems(medicationRequests, medicationDispenses)
  const messageHistory = extractMessageHistory(requestGroup, doHSData, medicationRequests, medicationDispenses, logger)

  // TODO: extract NHS App status from dispensing information extension
  // const dispensingInfoExt = findExtensionByKey(dispense.extension, "DISPENSING_INFORMATION")

  let statusCode
  let cancellationReason
  const statusExt = findExtensionsByKey(requestGroup.extension, "PRESCRIPTION_STATUS_HISTORY")
  for (const ext of statusExt){
    const url = ext.extension?.[0].url
    const system = ext.extension?.[0].valueCoding?.system
    if (url === "status" && system === "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status"){
      statusCode = ext?.extension?.[0].valueCoding?.code
    }
    if (url === "cancellationReason" && system === "https://fhir.nhs.uk/CodeSystem/medicationrequest-status-reason"){
      cancellationReason = ext?.extension?.[0].valueCoding?.code
    }
  }

  const nonDispensingExt = findExtensionByKey(requestGroup.extension, "NON_DISPENSING_REASON")
  const nonDispensingReason = nonDispensingExt?.valueCoding?.code

  // create organization summaries
  const prescriptionTypeCode = prescriptionTypeExt?.valueCoding?.code ?? "Unknown"

  const prescriberOrg = createOrganizationSummary(
    doHSData.prescribingOrganization,
    prescribingOrganization,
    mapPrescriptionOrigin(prescriptionTypeCode)
  )

  const nominatedDispenser = nominatedPerformer
    ? createOrganizationSummary(doHSData.nominatedPerformer, nominatedPerformer)
    : undefined

  const currentDispenser = dispensingOrganization
    ? createOrganizationSummary(doHSData.dispensingOrganization, dispensingOrganization)
    : undefined

  return {
    patientDetails,
    prescriptionId,
    typeCode,
    ...(statusCode ? {statusCode} : {statusCode: "unknown"}),
    issueDate,
    instanceNumber,
    maxRepeats,
    daysSupply,
    prescriptionPendingCancellation,
    items,
    messageHistory,
    prescriberOrg,
    nominatedDispenser,
    currentDispenser,
    cancellationReason,
    nonDispensingReason
  }
}
