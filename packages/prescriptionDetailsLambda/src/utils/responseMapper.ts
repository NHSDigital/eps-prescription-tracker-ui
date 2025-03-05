/* eslint-disable max-len */
import {
  MedicationRequest,
  MedicationDispense,
  RequestGroup,
  RequestGroupAction
} from "fhir/r4"
import {DoHSData, MergedResponse, Resource} from "./types"
import {mapIntentToPrescriptionTreatmentType} from "./fhirMappers"

export const mergePrescriptionDetails = (
  prescriptionDetails: RequestGroup | null,
  doHSData: DoHSData = {}
): MergedResponse | {message: string} => {
  if (!prescriptionDetails) return {message: "Prescription details not found"}

  // Extract RequestGroup data
  const prescriptionID = prescriptionDetails?.identifier?.[0]?.value || "Not found"
  const typeCode = prescriptionDetails?.extension?.find(ext => ext.url === "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType")?.valueCoding?.code || "Not found"
  const statusCode = mapIntentToPrescriptionTreatmentType(prescriptionDetails?.intent || "order")
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
      prefix: patientDataBundle[0]?.name?.[0]?.prefix?.[0] || "",
      given: patientDataBundle[0]?.name?.[0]?.given?.join(" ") || "Not found",
      family: patientDataBundle[0]?.name?.[0]?.family || "Not found",
      suffix: patientDataBundle[0]?.name?.[0]?.suffix?.[0] || ""
    },
    gender: patientDataBundle[0]?.gender ?? "Not found",
    birthDate: patientDataBundle[0]?.birthDate ?? "Not found",
    address: {
      text: patientDataBundle[0]?.address?.[0]?.text ?? "Not found",
      line: patientDataBundle[0]?.address?.[0]?.line?.join(", ") ?? "Not found",
      city: patientDataBundle[0]?.address?.[0]?.city ?? "Not found",
      district: patientDataBundle[0]?.address?.[0]?.district ?? "Not found",
      postalCode: patientDataBundle[0]?.address?.[0]?.postalCode ?? "Not found",
      type: patientDataBundle[0]?.address?.[0]?.type ?? "Not found",
      use: patientDataBundle[0]?.address?.[0]?.use ?? "Not found"
    }
  } : {
    identifier: "Not found",
    name: {prefix: "", given: "Not found", family: "Not found", suffix: ""},
    gender: "Not found",
    birthDate: "Not found",
    address: {
      text: "Not found",
      line: "Not found",
      city: "Not found",
      district: "Not found",
      postalCode: "Not found",
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
    organisationName: doHSData?.nominatedPerformer?.OrganisationName || "Not found",
    organisationODS: doHSData?.nominatedPerformer?.ODSCode || "Not found",
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
      name: doHSData?.prescribingOrganization?.OrganisationName || "Not found",
      odsCode: doHSData?.prescribingOrganization?.ODSCode || "Not found",
      address: `${doHSData?.prescribingOrganization?.Address1 || ""} ${doHSData?.prescribingOrganization?.City || ""} ${doHSData?.prescribingOrganization?.Postcode || ""}`.trim() || "Not found",
      telephone: doHSData?.prescribingOrganization?.Contacts?.find(c => c.ContactMethodType === "Telephone")?.ContactValue || "Not found",
      prescribedFrom: typeCode.startsWith("01") || typeCode.startsWith("1") ? "England" :
        typeCode.startsWith("02") || typeCode.startsWith("2") ? "Wales" : "Unknown"
    }
  }

  // Extract nominated dispenser
  const nominatedDispenser = doHSData?.nominatedPerformer ? {
    organisationSummaryObjective: {
      name: doHSData.nominatedPerformer.OrganisationName || "Not found",
      odsCode: doHSData.nominatedPerformer.ODSCode || "Not found",
      address: `${doHSData.nominatedPerformer.Address1 || ""} ${doHSData.nominatedPerformer.City || ""} ${doHSData.nominatedPerformer.Postcode || ""}`.trim() || "Not found",
      telephone: doHSData.nominatedPerformer.Contacts?.find(c => c.ContactMethodType === "Telephone")?.ContactValue || "Not found"
    }
  } : undefined

  // Extract current dispenser
  const currentDispenser = doHSData?.dispensingOrganization ? {
    organisationSummaryObjective: {
      name: doHSData.dispensingOrganization.OrganisationName || "Not found",
      odsCode: doHSData.dispensingOrganization.ODSCode || "Not found",
      address: `${doHSData.dispensingOrganization.Address1 || ""} ${doHSData.dispensingOrganization.City || ""} ${doHSData.dispensingOrganization.Postcode || ""}`.trim() || "Not found",
      telephone: doHSData.dispensingOrganization.Contacts?.find(c => c.ContactMethodType === "Telephone")?.ContactValue || "Not found"
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
