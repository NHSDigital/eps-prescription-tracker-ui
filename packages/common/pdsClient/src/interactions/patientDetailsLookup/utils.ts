import {PDSResponse} from "./types"
import {PatientDetails} from "@cpt-ui-common/common-types"
import {URL} from "url"
import path from "path"

/**
 * Maps PDS response to patient details without any fallback logic
 */
export const mapPdsResponseToPatientDetails = (pdsData: PDSResponse): PatientDetails => {
  return {
    nhsNumber: pdsData.id || "",
    given: pdsData.name?.[0]?.given?.join(" ") ?? "",
    family: pdsData.name?.[0]?.family ?? "",
    prefix: pdsData.name?.[0]?.prefix?.join(" ") ?? "",
    suffix: pdsData.name?.[0]?.suffix?.join(" ") ?? "",
    gender: pdsData.gender ?? null,
    dateOfBirth: pdsData.birthDate ?? null,
    address: pdsData.address?.[0] ? {
      line1: pdsData.address[0].line?.[0],
      line2: pdsData.address[0].line?.[1],
      city: pdsData.address[0].line?.[3],
      postcode: pdsData.address[0].postalCode
    } : null
  }
}

export const PATIENT_DETAILS_PATH = (pds_base: URL, nhsNumber: string): URL =>{
  const url = new URL(pds_base)
  url.pathname = path.join(url.pathname, "Patient", nhsNumber)
  return url
}
