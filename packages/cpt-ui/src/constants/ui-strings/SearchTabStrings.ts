import {FRONTEND_PATHS} from "../environment"

export const PRESCRIPTION_SEARCH_HERO = "Search for a prescription"
export const PRESCRIPTION_SEARCH_TABS = [
  {title: "Prescription ID search", link: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID},
  {title: "NHS number search", link: FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER},
  {title: "Basic details search", link: FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS}
]
