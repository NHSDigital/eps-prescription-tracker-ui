import {useCallback} from "react"
import {useNavigationContext} from "@/context/NavigationProvider"
import {FRONTEND_PATHS} from "@/constants/environment"

export const useBackNavigation = () => {
  const navigationContext = useNavigationContext()

  const getBackLink = useCallback(() => {
    const backPath = navigationContext.getBackPath()
    return backPath || FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
  }, [navigationContext])

  const goBack = useCallback(() => {
    navigationContext.goBack()
  }, [navigationContext])

  return {
    getBackLink,
    goBack
  }
}
