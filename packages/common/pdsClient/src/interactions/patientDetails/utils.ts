import {URL} from "url"
import path from "path"

export const PATIENT_DETAILS_PATH = (pds_base: URL, nhsNumber: string): URL =>{
  const url = new URL(pds_base)
  url.pathname = path.join(url.pathname, "Patient", nhsNumber)
  return url
}
