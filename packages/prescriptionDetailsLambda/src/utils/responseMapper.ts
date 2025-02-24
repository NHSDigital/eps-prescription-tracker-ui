/* eslint-disable max-len */
/**
 * Utility to merge Apigee prescription details and DoHS data into a structured JSON response.
 */
import {DoHSData, MergedResponse, RequestGroup} from "./types"

export const mergePrescriptionDetails = (
  prescriptionDetails: RequestGroup | null,
  doHSData: DoHSData = {}
): MergedResponse | {message: string} => {
  if (!prescriptionDetails) return {message: "Prescription details not found"}

  // Extract RequestGroup data
  const requestGroupDetails = {
    nhsNumber: prescriptionDetails?.identifier?.[0]?.value || "Not found"
  }

  // const patientEntry = prescriptionDetails.entry.find(entry => entry.resource?.resourceType === "Patient")
  // const prescriptionEntry = prescriptionDetails.entry.find(entry => entry.resource?.resourceType === "RequestGroup")
  // const medicationEntries = prescriptionDetails.entry.filter(entry => entry.resource?.resourceType === "MedicationRequest")
  // const taskEntry = prescriptionDetails.entry.find(entry => entry.resource?.resourceType === "Task")

  // // Extract patient details
  // const patientDetails = {
  //   nhsNumber: patientEntry?.identifier?.find(id => id.value)?.value || "Not found",
  //   gender: patientEntry?.gender || "Not found",
  //   birthDate: patientEntry?.birthDate || "Not found",
  //   prefix: patientEntry?.name?.[0]?.prefix?.join(" ") || "Not found",
  //   suffix: patientEntry?.name?.[0]?.suffix?.join(" ") || "Not found",
  //   given: patientEntry?.name?.[0]?.given?.join(" ") || "Not found",
  //   family: patientEntry?.name?.[0]?.family || "Not found",
  //   address: patientEntry?.address?.[0]?.text || "Not found"
  // }

  // // Extract prescription-level data
  // const prescriptionID = prescriptionEntry?.identifier?.find(id => id.value)?.value || "Not found"
  // const typeCode = prescriptionEntry?.resource?.intent || "Not found"
  // const statusCode = prescriptionEntry?.resource?.status || "Not found"
  // const issueDate = prescriptionEntry?.resource?.authoredOn || "Not found"

  // // Extract repeat information
  // const repeatExtension = prescriptionEntry?.resource?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation")
  // const instanceNumber = repeatExtension?.extension?.find(ext => ext.url === "numberOfRepeatsIssued")?.valueInteger || "Not found"
  // const maxRepeats = repeatExtension?.extension?.find(ext => ext.url === "numberOfRepeatsAllowed")?.valueInteger || "Not found"

  // // Determine prescriptionPendingCancellation
  // const prescriptionPendingCancellation = statusCode === "cancelled"

  // // Extract prescribed items
  // const prescribedItems = medicationEntries.map(entry => ({
  //   itemDetails: {
  //     medicationName: entry.resource?.medicationCodeableConcept?.coding?.[0]?.display || "Not found",
  //     quantity: entry.resource?.dispenseRequest?.quantity?.value?.toString() || "Not found",
  //     dosageInstructions: entry.resource?.dosageInstruction?.[0]?.text || "Not found",
  //     epsStatusCode: entry.resource?.status || "Not found",
  //     nhsAppStatus: "Optional - Not available",
  //     itemPendingCancellation: entry.resource?.status === "cancelled",
  //     cancellationReason: entry.resource?.status === "cancelled" ? "Cancelled by prescriber" : null
  //   }
  // }))

  // // Extract dispensed items
  // // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const dispensedItems = taskEntry?.resource?.output?.map(output => ({
  //   itemDetails: {
  //     medicationName: "Not found",
  //     quantity: "Not found",
  //     dosageInstructions: "Not found",
  //     epsStatusCode: taskEntry.resource?.status || "Not found",
  //     nhsAppStatus: "Optional - Not available",
  //     itemPendingCancellation: taskEntry.resource?.status === "cancelled",
  //     cancellationReason: taskEntry.resource?.status === "cancelled" ? "Cancelled during dispensing" : null
  //   }
  // })) || []

  // // Extract message history
  // const messageHistory = taskEntry ? [{
  //   messageCode: taskEntry.resource?.businessStatus?.coding?.[0]?.code || "Not found",
  //   sentDateTime: taskEntry.resource?.authoredOn || "Not found",
  //   organisationName: doHSData?.value?.[0]?.OrganisationName || "DoHS",
  //   organisationODS: doHSData?.value?.[0]?.ODSCode || "Not found",
  //   newStatusCode: taskEntry.resource?.status || "Not found",
  //   dispenseNotification: taskEntry.resource?.output?.map(output => ({
  //     ID: output.valueReference?.reference || "Not found",
  //     medicationName: "Not found",
  //     quantity: "Not found",
  //     dosageInstruction: "Not found"
  //   }))
  // }] : []

  // // Extract prescriber organisation
  // const prescriberOrganisation = {
  //   organisationSummaryObjective: {
  //     name: doHSData?.value?.[0]?.OrganisationName || "Not found",
  //     odsCode: doHSData?.value?.[0]?.ODSCode || "Not found",
  //     address: `${doHSData?.value?.[0]?.Address1 || ""} ${doHSData?.value?.[0]?.City || ""} ${doHSData?.value?.[0]?.Postcode || ""}`.trim() || "Not found",
  //     telephone: doHSData?.value?.[0]?.Contacts?.find(c => c.ContactMethodType === "Telephone")?.ContactValue || "Not found",
  //     prescribedFrom: typeCode.startsWith("01") || typeCode.startsWith("1") ? "England" :
  //       typeCode.startsWith("02") || typeCode.startsWith("2") ? "Wales" : "Unknown"
  //   }
  // }

  // Extract nominated dispenser
  const nominatedDispenser = doHSData?.value?.[0] ? {
    organisationSummaryObjective: {
      name: doHSData.value[0]?.OrganisationName || "Not found",
      odsCode: doHSData.value[0]?.ODSCode || "Not found",
      address: `${doHSData.value[0]?.Address1 || ""} ${doHSData.value[0]?.City || ""} ${doHSData.value[0]?.Postcode || ""}`.trim() || "Not found",
      telephone: doHSData.value[0]?.Contacts?.find(c => c.ContactMethodType === "Telephone")?.ContactValue || "Not found"
    }
  } : undefined

  // Extract current dispenser
  const currentDispenser = doHSData?.value?.[0] ? {
    organisationSummaryObjective: {
      name: doHSData.value[0]?.OrganisationName || "Not found",
      odsCode: doHSData.value[0]?.ODSCode || "Not found",
      address: `${doHSData.value[0]?.Address1 || ""} ${doHSData.value[0]?.City || ""} ${doHSData.value[0]?.Postcode || ""}`.trim() || "Not found",
      telephone: doHSData.value[0]?.Contacts?.find(c => c.ContactMethodType === "Telephone")?.ContactValue || "Not found"
    }
  } : undefined

  // Final merged JSON
  return {
    requestGroupDetails: requestGroupDetails.nhsNumber,
    nominatedDispenser,
    currentDispenser
  }
}
