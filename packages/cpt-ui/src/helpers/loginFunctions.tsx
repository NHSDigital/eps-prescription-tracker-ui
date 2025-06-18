import {FRONTEND_PATHS} from "@/constants/environment"

export const getHomeLink = (isSignedIn: boolean) => {
  return isSignedIn ? FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID : FRONTEND_PATHS.LOGIN
}
