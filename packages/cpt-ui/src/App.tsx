import {Routes, Route, useLocation} from "react-router-dom"
import {AuthProvider} from "@/context/AuthProvider"
import {AccessProvider} from "@/context/AccessProvider"
import {SearchProvider} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"
import {PatientDetailsProvider} from "./context/PatientDetailsProvider"
import {PrescriptionInformationProvider} from "./context/PrescriptionInformationProvider"
import Layout from "@/Layout"

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

  // Check if we're on a prescription list or prescription details page
  const isPrescriptionPage =
    location.pathname === FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT ||
    location.pathname === FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE ||
    location.pathname === FRONTEND_PATHS.PRESCRIPTION_LIST_PAST ||
    location.pathname.startsWith(FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE)

  const skipTarget = isPrescriptionPage ? "#patient-details-banner" : "#main-content"

  return (
    <PatientDetailsProvider>
      <EPSCookieBanner />
      <a
        href={skipTarget}
        className="nhsuk-skip-link"
        data-testid="eps_header_skipLink"
      >
        {HEADER_STRINGS.SKIP_TO_MAIN_CONTENT}
      </a>
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
