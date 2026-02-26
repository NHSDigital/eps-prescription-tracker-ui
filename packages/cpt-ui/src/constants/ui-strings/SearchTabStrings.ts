import {TabHeader} from "@/components/EpsTabs"
import {FRONTEND_PATHS} from "../environment"

// Note: Tests reference these consts
export const PRESCRIPTION_ID_SEARCH_TAB_TITLE = "Prescription ID search"
export const NHS_NUMBER_SEARCH_TAB_TITLE = "NHS number search"
export const BASIC_DETAILS_SEARCH_TAB_TITLE = "Basic details search"

export const PRESCRIPTION_SEARCH_HERO = "Search for a prescription"
export const PRESCRIPTION_SEARCH_TABS: Array<TabHeader> = [
  {title: PRESCRIPTION_ID_SEARCH_TAB_TITLE, link: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID},
  {title: NHS_NUMBER_SEARCH_TAB_TITLE, link: FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER},
  {title: BASIC_DETAILS_SEARCH_TAB_TITLE, link: FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS}
]
