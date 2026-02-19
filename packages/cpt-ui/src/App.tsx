import {Routes, Route, useLocation} from "react-router-dom"
import {AuthProvider} from "@/context/AuthProvider"
import {AccessProvider} from "@/context/AccessProvider"
import {SearchProvider} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"
import {PatientDetailsProvider} from "./context/PatientDetailsProvider"
import {PrescriptionInformationProvider} from "./context/PrescriptionInformationProvider"
import Layout from "@/Layout"
import {useEffect} from "react"
import {useLocalStorageState} from "./helpers/useLocalStorageState"

import LoginPage from "@/pages/LoginPage"
import LogoutPage from "@/pages/LogoutPage"
import SelectYourRolePage from "@/pages/SelectYourRolePage"
import ChangeRolePage from "@/pages/ChangeRolePage"
import SearchPrescriptionPage from "@/pages/SearchPrescriptionPage"
import YourSelectedRolePage from "@/pages/YourSelectedRolePage"
import NotFoundPage from "@/pages/NotFoundPage"
import PrescriptionListPage from "@/pages/PrescriptionListPage"
import PrescriptionDetailsPage from "@/pages/PrescriptionDetailsPage"
import EPSCookieBanner from "./components/EPSCookieBanner"
import CookiePolicyPage from "./pages/CookiePolicyPage"
import CookieSettingsPage from "./pages/CookieSettingsPage"
import SearchResultsPage from "@/pages/BasicDetailsSearchResultsPage"
import TooManySearchResultsPage from "@/pages/TooManySearchResultsPage"
import PrivacyNoticePage from "./pages/PrivacyNoticePage"
import SessionSelectionPage from "./pages/SessionSelection"
import NoPrescriptionsFoundPage from "@/pages/NoPrescriptionsFoundPage"
import NoPatientsFoundPage from "@/pages/NoPatientsFoundPage"

import {FRONTEND_PATHS} from "@/constants/environment"
import SessionLoggedOutPage from "./pages/SessionLoggedOut"
import {HEADER_STRINGS} from "@/constants/ui-strings/HeaderStrings"

function AppContent() {
  const location = useLocation()

  // Persist last focused interactive element for page refresh scenarios
  const [lastFocusedElement, setLastFocusedElement] = useLocalStorageState<string | null>(
    "lastFocusedElement",
    "focusState",
    null
  )
  const [lastPathname, setLastPathname] = useLocalStorageState<string>(
    "lastPathname",
    "focusState",
    location.pathname
  )

  useEffect(() => {
    let hasTabbed = false
    let hasUserInteracted = false

    const isNavigation = lastPathname !== location.pathname

    try {
      localStorage.getItem("focusState")
    } catch {
      // Silent handling - dont need to do anything
    }

    if (isNavigation) {
      setLastFocusedElement(null)
      setLastPathname(location.pathname)
    }

    const handleUserInteraction = (event: Event) => {
      hasUserInteracted = true
      const target = event.target as HTMLElement

      if (target && target.id) {
        const interactiveSelectors = [
          "presc-id-input",
          "nhs-number-input",
          "first-name",
          "last-name",
          "dob-day-input",
          "dob-month-input",
          "dob-year-input",
          "postcode-input"
        ]

        if (interactiveSelectors.includes(target.id)) {
          const selector = `#${target.id}`
          setLastFocusedElement(selector)
          setLastPathname(location.pathname)

          try {
            const focusData = {
              lastFocusedElement: selector,
              lastPathname: location.pathname
            }
            localStorage.setItem("focusState", JSON.stringify(focusData))
          } catch {
            // Silent handling - dont need to do anything
          }
        }
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !hasTabbed && !e.shiftKey) {
        hasTabbed = true

        let storedFocusData = null
        let storedElement = null
        let storedPathname = null

        try {
          const stored = localStorage.getItem("focusState")
          if (stored) {
            storedFocusData = JSON.parse(stored)
            storedElement = storedFocusData.lastFocusedElement
            storedPathname = storedFocusData.lastPathname
          }
        } catch {
          // Silent handling - dont need to do anything
        }
        const isStoredPageRefresh = storedPathname === location.pathname

        if (isStoredPageRefresh && storedElement) {
          const savedElement = document.querySelector(storedElement) as HTMLElement

          if (savedElement && savedElement.offsetParent !== null) {
            e.preventDefault()
            savedElement.focus()
            document.removeEventListener("keydown", handleKeyDown)
            const mainContent = document.querySelector("#main-content") || document.body
            mainContent.removeEventListener("click", handleUserInteraction)
            mainContent.removeEventListener("focusin", handleUserInteraction)
            mainContent.removeEventListener("input", handleUserInteraction)
            return
          }
        }

        const activeElement = document.activeElement as HTMLElement
        if (activeElement &&
            activeElement !== document.body &&
            activeElement.tagName !== "HTML" &&
            (activeElement.tagName === "INPUT" ||
              activeElement.tagName === "TEXTAREA" || activeElement.tagName === "SELECT")) {
          document.removeEventListener("keydown", handleKeyDown)
          const mainContent = document.querySelector("#main-content") || document.body
          mainContent.removeEventListener("click", handleUserInteraction)
          mainContent.removeEventListener("focusin", handleUserInteraction)
          mainContent.removeEventListener("input", handleUserInteraction)
          return
        }

        // Only focus skip link if user has not interacted with the page at all
        if (!hasUserInteracted) {
          e.preventDefault()
          const skipLink = document.querySelector(".nhsuk-skip-link") as HTMLElement
          if (skipLink) {
            skipLink.focus()
          }
        }

        document.removeEventListener("keydown", handleKeyDown)
        const mainContent = document.querySelector("#main-content") || document.body
        mainContent.removeEventListener("click", handleUserInteraction)
        mainContent.removeEventListener("focusin", handleUserInteraction)
        mainContent.removeEventListener("input", handleUserInteraction)
      }
    }

    const addDirectListeners = () => {
      const inputs = document.querySelectorAll("input")

      inputs.forEach((input) => {
        const directHandler = (e: Event) => {
          handleUserInteraction(e)
        }

        input.addEventListener("click", directHandler)
        input.addEventListener("focus", directHandler)
        input.addEventListener("input", directHandler)
      })
    }

    setTimeout(addDirectListeners, 100)

    const mainContent = document.querySelector("#main-content") || document.body
    mainContent.addEventListener("click", handleUserInteraction)
    mainContent.addEventListener("focusin", handleUserInteraction)
    mainContent.addEventListener("input", handleUserInteraction)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      const mainContent = document.querySelector("#main-content") || document.body
      mainContent.removeEventListener("click", handleUserInteraction)
      mainContent.removeEventListener("focusin", handleUserInteraction)
      mainContent.removeEventListener("input", handleUserInteraction)
    }
  }, [location.pathname, lastFocusedElement, lastPathname, setLastFocusedElement, setLastPathname])

  // Check if we're on a prescription list or prescription details page
  const isPrescriptionPage =
    location.pathname === FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT ||
    location.pathname === FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE ||
    location.pathname === FRONTEND_PATHS.PRESCRIPTION_LIST_PAST ||
    location.pathname.startsWith(FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE)

  const skipTarget = isPrescriptionPage ? "#patient-details-banner" : "#main-content"

  return (
    <>
      <a
        href={skipTarget}
        className="nhsuk-skip-link"
        data-testid="eps_header_skipLink"
      >
        {HEADER_STRINGS.SKIP_TO_MAIN_CONTENT}
      </a>
      <PatientDetailsProvider>
        <EPSCookieBanner />
        <PrescriptionInformationProvider>
          <SearchProvider>
            <NavigationProvider>
              <Routes>
                <Route path="/" element={<Layout />}>
                  {/* Public cookie routes */}
                  <Route path="cookies" element={<CookiePolicyPage />} />
                  <Route path="cookies-selected" element={<CookieSettingsPage />} />

                  {/* Your existing routes */}
                  <Route path="*" element={<NotFoundPage />} />
                  <Route path={FRONTEND_PATHS.SESSION_SELECTION} element={<SessionSelectionPage />} />
                  <Route path={FRONTEND_PATHS.LOGIN} element={<LoginPage />} />
                  <Route path={FRONTEND_PATHS.LOGOUT} element={<LogoutPage />} />
                  <Route path={FRONTEND_PATHS.SESSION_LOGGED_OUT} element={<SessionLoggedOutPage />} />
                  <Route path={FRONTEND_PATHS.SELECT_YOUR_ROLE} element={<SelectYourRolePage />} />
                  <Route path={FRONTEND_PATHS.YOUR_SELECTED_ROLE} element={<YourSelectedRolePage />} />
                  <Route path={FRONTEND_PATHS.CHANGE_YOUR_ROLE} element={<ChangeRolePage />} />
                  <Route path={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID} element={<SearchPrescriptionPage />} />
                  <Route path={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER} element={<SearchPrescriptionPage />} />
                  <Route path={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS} element={<SearchPrescriptionPage />} />
                  <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT} element={<PrescriptionListPage />} />
                  <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE} element={<PrescriptionListPage />} />
                  <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_PAST} element={<PrescriptionListPage />} />
                  <Route path={FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE} element={<PrescriptionDetailsPage />} />
                  <Route path={FRONTEND_PATHS.PATIENT_SEARCH_RESULTS} element={<SearchResultsPage />} />
                  <Route path={FRONTEND_PATHS.TOO_MANY_SEARCH_RESULTS} element={<TooManySearchResultsPage />} />
                  <Route path={FRONTEND_PATHS.NO_PATIENT_FOUND} element={<NoPatientsFoundPage />} />
                  <Route path={FRONTEND_PATHS.NO_PRESCRIPTIONS_FOUND} element={<NoPrescriptionsFoundPage />} />
                  <Route path={FRONTEND_PATHS.PRIVACY_NOTICE} element={<PrivacyNoticePage />} />
                </Route>
              </Routes>
            </NavigationProvider>
          </SearchProvider>
        </PrescriptionInformationProvider>
      </PatientDetailsProvider>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AccessProvider>
        <AppContent />
      </AccessProvider>
    </AuthProvider>
  )
}
