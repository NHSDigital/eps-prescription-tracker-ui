import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from "react"
import {useNavigate, useLocation} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {logger} from "@/helpers/logger"

export type NavigationEntry = {
  path: string;
};

export interface NavigationContextType {
  pushNavigation: (path: string) => void;
  goBack: () => void;
  getBackPath: () => string | null;

  setOriginalSearchPage: (
    searchType: "prescriptionId" | "nhsNumber" | "basicDetails",
  ) => void

  captureOriginalSearchParameters: (
    searchType: "prescriptionId" | "nhsNumber" | "basicDetails",
    searchParams: Record<string, string | undefined>,
  ) => void;
  getOriginalSearchParameters: () => Record<string, string | undefined> | null;
  getRelevantSearchParameters: (
    searchType: "prescriptionId" | "nhsNumber" | "basicDetails",
  ) => Record<string, string | undefined>;

  startNewNavigationSession: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export const useNavigationContext = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error(
      "useNavigationContext must be used within NavigationProvider"
    )
  }
  return context
}

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [navigationStack, setNavigationStack] = useState<Array<NavigationEntry>>([])
  const [originalSearchPage, setOriginalSearchPageState] = useState<{ path: string} | null>(null)
  const [originalSearchParameters, setOriginalSearchParameters] = useState<{
    searchType: "prescriptionId" | "nhsNumber" | "basicDetails";
    params: Record<string, string | undefined>
  } | null>(null)

  // prescription list pages that should be treated as one logical unit
  const prescriptionListPages = [
    FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
    FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE,
    FRONTEND_PATHS.PRESCRIPTION_LIST_PAST
  ]

  const searchPages = [
    FRONTEND_PATHS.SEARCH,
    FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
    FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER,
    FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
  ]

  const pushNavigation = useCallback(
    (path: string) => {
      const newEntry: NavigationEntry = {
        path
      }

      setNavigationStack((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].path === path) {
          return prev
        }

        // special handling for prescription details navigation
        if (path === FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE) {
          return [...prev, newEntry]
        }

        // if navigating to a prescription list page and we already have one in stack,
        // replace it instead of adding a new entry (treating tabs as one logical page)
        if (prescriptionListPages.includes(path)) {
          const lastEntry = prev[prev.length - 1]
          if (lastEntry && prescriptionListPages.includes(lastEntry.path)) {
            return [...prev.slice(0, -1), newEntry]
          }
        }

        logger.info("Navigation: Pushing entry", {
          path,
          stackLength: prev.length + 1
        })
        return [...prev, newEntry]
      })
    },
    [prescriptionListPages]
  )

  const setOriginalSearchPage = useCallback(
    (searchType: "prescriptionId" | "nhsNumber" | "basicDetails") => {
      const searchPaths = {
        prescriptionId: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
        nhsNumber: FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER,
        basicDetails: FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
      }

      const searchPage = {
        path: searchPaths[searchType]
      }

      logger.info("Navigation: Setting original search page", searchPage)
      setOriginalSearchPageState(searchPage)
    },
    []
  )

  const captureOriginalSearchParameters = useCallback(
    (
      searchType: "prescriptionId" | "nhsNumber" | "basicDetails",
      searchParams: Record<string, string | undefined>
    ) => {
      logger.info("Navigation: Capturing original search parameters", {
        searchType,
        params: searchParams
      })
      setOriginalSearchParameters({
        searchType,
        params: {...searchParams}
      })

      // clear navigation stack to start fresh navigation session and set the original search page
      setNavigationStack([])
      setOriginalSearchPage(searchType)
    },
    [setOriginalSearchPage]
  )

  const getOriginalSearchParameters = useCallback(() => {
    return originalSearchParameters?.params || null
  }, [originalSearchParameters])

  const getRelevantSearchParameters = useCallback(
    (searchType: "prescriptionId" | "nhsNumber" | "basicDetails") => {
      if (
        !originalSearchParameters ||
        originalSearchParameters.searchType !== searchType
      ) {
        return {}
      }

      // return only parameters relevant to the specified search type
      const relevantKeys = {
        prescriptionId: ["prescriptionId", "issueNumber"],
        nhsNumber: ["nhsNumber"],
        basicDetails: [
          "firstName",
          "lastName",
          "dobDay",
          "dobMonth",
          "dobYear",
          "postcode"
        ]
      }

      const keys = relevantKeys[searchType] || []
      const relevantParams: Record<string, string | undefined> = {}

      keys.forEach((key) => {
        if (originalSearchParameters.params[key] !== undefined) {
          relevantParams[key] = originalSearchParameters.params[key]
        }
      })

      logger.info("Navigation: Getting relevant search parameters", {
        searchType,
        originalParams: originalSearchParameters.params,
        relevantParams
      })

      return relevantParams
    },
    [originalSearchParameters]
  )

  const getBackPath = useCallback((): string | null => {
    const currentPath = location.pathname

    // if we're on prescription details page, find the last prescription list page in stack
    if (currentPath === FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE) {
      for (let i = navigationStack.length - 1; i >= 0; i--) {
        const entry = navigationStack[i]
        if (prescriptionListPages.includes(entry.path)) {
          return entry.path
        }
      }
      return FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT
    }

    if (originalSearchPage && !prescriptionListPages.includes(currentPath)) {
      return originalSearchPage.path
    }

    if (prescriptionListPages.includes(currentPath)) {
      if (originalSearchPage) {
        return originalSearchPage.path
      }
      // fallback to navigation stack
      if (navigationStack.length >= 2) {
        // find the last non-prescription-list entry
        for (let i = navigationStack.length - 2; i >= 0; i--) {
          if (!prescriptionListPages.includes(navigationStack[i].path)) {
            return navigationStack[i].path
          }
        }
      }
    }

    if (navigationStack.length >= 2) {
      return navigationStack[navigationStack.length - 2].path
    }

    return null
  }, [
    location.pathname,
    navigationStack,
    originalSearchPage,
    prescriptionListPages
  ])

  const goBack = useCallback(() => {
    const backPath = getBackPath()
    const currentPath = location.pathname

    logger.info("Navigation: Going back", {
      from: currentPath,
      to: backPath,
      stackLength: navigationStack.length,
      originalSearchPage
    })

    if (!backPath) {
      logger.warn("Navigation: No back path found, staying on current page")
      return
    }

    setNavigationStack((prev) => {
      // if going back to original search page from prescription list, clear the stack
      if (
        prescriptionListPages.includes(currentPath) &&
        originalSearchPage?.path === backPath
      ) {
        return [{path: backPath}]
      }

      // if going back from prescription details to list, remove details entry
      if (
        currentPath === FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE &&
        prescriptionListPages.includes(backPath)
      ) {
        return prev.filter(
          (entry) => entry.path !== FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE
        )
      }

      return prev.slice(0, -1)
    })

    navigate(backPath)
  }, [
    getBackPath,
    location.pathname,
    navigate,
    navigationStack,
    originalSearchPage,
    prescriptionListPages
  ])

  const startNewNavigationSession = useCallback(() => {
    setNavigationStack([])
    setOriginalSearchPageState(null)
    setOriginalSearchParameters(null)
  }, [])

  useEffect(() => {
    const currentPath = location.pathname

    const currentEntry =
      navigationStack.length > 0
        ? navigationStack[navigationStack.length - 1]
        : null
    if (currentEntry?.path === currentPath) {
      return
    }

    if (searchPages.includes(currentPath) && !originalSearchPage) {
      const searchType = currentPath.includes("prescription-id")
        ? "prescriptionId"
        : currentPath.includes("nhs-number")
          ? "nhsNumber"
          : "basicDetails"
      setOriginalSearchPage(searchType)
    }

    pushNavigation(currentPath)
  }, [
    location.pathname,
    navigationStack,
    originalSearchPage,
    pushNavigation,
    searchPages
  ])

  const contextValue: NavigationContextType = {
    pushNavigation,
    goBack,
    getBackPath,
    setOriginalSearchPage,
    captureOriginalSearchParameters,
    getOriginalSearchParameters,
    getRelevantSearchParameters,
    startNewNavigationSession
  }

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  )
}
