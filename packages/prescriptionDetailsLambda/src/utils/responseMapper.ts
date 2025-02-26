/* eslint-disable max-len */
import {
  MedicationRequest,
  MedicationDispense,
  RequestGroup,
  RequestGroupAction
} from "fhir/r4"
import {DoHSData, MergedResponse, Resource} from "./types"

export const mergePrescriptionDetails = (
  prescriptionDetails: RequestGroup | null,
  doHSData: DoHSData = {}
): MergedResponse | {message: string} => {
  if (!prescriptionDetails) return {message: "Prescription details not found"}

  // Extract RequestGroup data
  const prescriptionID = prescriptionDetails?.identifier?.[0]?.value || "Not found"
  const typeCode = prescriptionDetails?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType")?.valueCoding?.code || "Not found"
  const statusCode = prescriptionDetails?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionStatusHistory")?.extension?.[0]?.valueCoding?.code || "Not found"
  const issueDate = prescriptionDetails?.authoredOn || "Not found"
  const instanceNumber = prescriptionDetails?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation")?.extension?.find(ext => ext.url === "numberOfRepeatsIssued")?.valueInteger || "Not found"
  const maxRepeats = prescriptionDetails?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation")?.extension?.find(ext => ext.url === "numberOfRepeatsAllowed")?.valueInteger || "Not found"
  const daysSupply = "Not found"
  const prescriptionPendingCancellation = prescriptionDetails?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PendingCancellations")?.extension?.find(ext => ext.url === "prescriptionPendingCancellation")?.valueBoolean || false

  // Extract Patient Data
  const patientDataBundle = (prescriptionDetails.contained?.filter(
    (contained) => contained.resourceType === "Patient"
  ) as Array<Resource>) || []

  // Extract Full Patient Details
  const patientDetails = patientDataBundle.length > 0 ? {
    identifier: patientDataBundle[0]?.identifier?.[0]?.value || "Not found",
    name: {
      prefix: patientDataBundle[0]?.name?.[0]?.prefix?.[0] || "Not found",
      given: patientDataBundle[0]?.name?.[0]?.given?.join(" ") || "Not found",
      family: patientDataBundle[0]?.name?.[0]?.family || "Not found",
      suffix: patientDataBundle[0]?.name?.[0]?.suffix?.[0] || "Not found"
    },
    gender: patientDataBundle[0]?.gender || "Not found",
    birthDate: patientDataBundle[0]?.birthDate || "Not found",
    address: {
      line: patientDataBundle[0]?.address?.[0]?.line?.join(", ") || "Not found",
      city: patientDataBundle[0]?.address?.[0]?.city || "Not found",
      district: patientDataBundle[0]?.address?.[0]?.district || "Not found",
      postalCode: patientDataBundle[0]?.address?.[0]?.postalCode || "Not found",
      text: patientDataBundle[0]?.address?.[0]?.text || "Not found",
      type: patientDataBundle[0]?.address?.[0]?.type || "Not found",
      use: patientDataBundle[0]?.address?.[0]?.use || "Not found"
    }
  } : {
    identifier: "Not found",
    name: {
      prefix: "Not found",
      given: "Not found",
      family: "Not found",
      suffix: "Not found"
    },
    gender: "Not found",
    birthDate: "Not found",
    address: {
      line: "Not found",
      city: "Not found",
      district: "Not found",
      postalCode: "Not found",
      text: "Not found",
      type: "Not found",
      use: "Not found"
    }
  }

  // Extract prescribed items
  const prescribedItems = ((prescriptionDetails.contained?.filter(
    (contained) => contained.resourceType === "MedicationRequest"
  ) as Array<MedicationRequest>) || []).map(item => ({
    itemDetails: {
      medicationName: item?.medicationCodeableConcept?.coding?.[0]?.display || "Not found",
      quantity: item?.dispenseRequest?.quantity?.value?.toString() || "Not found",
      dosageInstructions: item?.dosageInstruction?.[0]?.text || "Not found",
      epsStatusCode: item?.status || "Not found",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: item?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PendingCancellations")?.extension?.find(ext => ext.url === "lineItemPendingCancellation")?.valueBoolean || false,
      cancellationReason: item?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PendingCancellations")?.extension?.find(ext => ext.url === "cancellationReason")?.valueCoding?.display || null
    }
  }))

  // Extract dispensed items
  const dispensedItems = ((prescriptionDetails.contained?.filter(
    (contained) => contained.resourceType === "MedicationDispense"
  ) as Array<MedicationDispense>) || []).map(item => ({
    itemDetails: {
      medicationName: item?.medicationCodeableConcept?.coding?.[0]?.display || "Not found",
      quantity: item?.quantity?.value?.toString() || "Not found",
      dosageInstructions: item?.dosageInstruction?.[0]?.text || "Not found",
      epsStatusCode: item?.status || "Not found",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: item?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionNonDispensingReason")?.valueCoding?.display || null,
      initiallyPrescribed: {
        medicationName: item?.medicationCodeableConcept?.coding?.[0]?.display || "Not found",
        quantity: item?.quantity?.value?.toString() || "Not found",
        dosageInstructions: item?.dosageInstruction?.[0]?.text || "Not found"
      }
    }
  }))

  // Extract message history
  const messageHistory = ((prescriptionDetails?.action?.[0]?.action as Array<RequestGroupAction>) || []).map(action => ({
    messageCode: action?.code?.[0]?.coding?.[0]?.code || "Not found",
    sentDateTime: action?.timingDateTime || "Not found",
    organisationName: doHSData?.value?.[0]?.OrganisationName || "Not found",
    organisationODS: doHSData?.value?.[0]?.ODSCode || "Not found",
    newStatusCode: action?.code?.[0]?.coding?.[0]?.display || "Not found",
    dispenseNotification: (action?.action || []).map(dispense => ({
      ID: dispense?.resource?.reference || "Not found",
      medicationName: "Not found",
      quantity: "Not found",
      dosageInstruction: "Not found"
    }))
  }))

  // Extract prescriber organisation
  const prescriberOrganisation = {
    organisationSummaryObjective: {
      name: doHSData?.value?.[0]?.OrganisationName || "Not found",
      odsCode: doHSData?.value?.[0]?.ODSCode || "Not found",
      address: `${doHSData?.value?.[0]?.Address1 || ""} ${doHSData?.value?.[0]?.City || ""} ${doHSData?.value?.[0]?.Postcode || ""}`.trim() || "Not found",
      telephone: doHSData?.value?.[0]?.Contacts?.find(c => c.ContactMethodType === "Telephone")?.ContactValue || "Not found",
      prescribedFrom: typeCode.startsWith("01") || typeCode.startsWith("1") ? "England" :
        typeCode.startsWith("02") || typeCode.startsWith("2") ? "Wales" : "Unknown"
    }
  }

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
    patientDetails,
    prescriptionID,
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
