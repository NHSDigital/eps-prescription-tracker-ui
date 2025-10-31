import {PDSResponse} from "./types"
import {NOT_AVAILABLE, PatientDetails} from "@cpt-ui-common/common-types"
import {URL} from "url"
import path from "path"
import {PatientAddressUse, PatientNameUse} from "../patientSearch/schema"

// TODO: AEA-5926 - should probably be common logic between both interactions
export const mapPdsResponseToPatientDetails = (pdsData: PDSResponse): PatientDetails => {
  /* Return "n/a" for any missing fields on a returned patient record, so that the UI can
  correctly display that those fields are truly not present on the returned record and are
  not unavailable due to not finding the patient or having some issue calling PDS */
  const usualName = pdsData?.name?.find((name) => name.use === PatientNameUse.USUAL)
  const homeAddress = pdsData?.address?.find((address) => address.use === PatientAddressUse.HOME)

  return {
    nhsNumber: pdsData.id,
    gender: pdsData?.gender ?? NOT_AVAILABLE,
    dateOfBirth: pdsData?.birthDate ?? NOT_AVAILABLE,
    familyName: usualName?.family ?? NOT_AVAILABLE,
    givenName: usualName?.given ?? NOT_AVAILABLE,
    address: homeAddress?.line ?? NOT_AVAILABLE,
    postcode: homeAddress?.postalCode ?? NOT_AVAILABLE
  }
}

export const PATIENT_DETAILS_PATH = (pds_base: URL, nhsNumber: string): URL =>{
  const url = new URL(pds_base)
  url.pathname = path.join(url.pathname, "Patient", nhsNumber)
  return url
}
