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
  const requestGroupData = {
    prescriptionId: prescriptionDetails?.identifier?.[0]?.value || "Not found",
    odsCode: prescriptionDetails?.author?.identifier?.value || "Not found",
    authoredOn: prescriptionDetails?.authoredOn || "Not found"
  }

  // Extract Patient data
  const patientDataBundle = prescriptionDetails.contained.filter(contained => contained.resourceType === "Patient")
  const patientData = {
    nhsNumber: patientDataBundle.identifier.value,
    gender: patientDataBundle.gender
  }

  console.log("patientDataBundle:", {patientDataBundle})
  console.log("patientData:", {patientData})

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
    requestGroupData,
    nominatedDispenser,
    currentDispenser
  }
}
