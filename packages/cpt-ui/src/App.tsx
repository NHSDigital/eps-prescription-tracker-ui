import {Routes, Route} from "react-router-dom"
import {AuthProvider} from "@/context/AuthProvider"
import {AccessProvider} from "@/context/AccessProvider"
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
import PrivacyNoticePage from "./pages/PrivacyNoticePage"

import {FRONTEND_PATHS} from "@/constants/environment"

export default function App() {
  return (
    <AuthProvider>
      <AccessProvider>
        <PatientDetailsProvider>
          <EPSCookieBanner />
          <PrescriptionInformationProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Public cookie routes */}
                <Route path="cookies" element={<CookiePolicyPage />} />
                <Route path="cookies-selected" element={<CookieSettingsPage />} />

                {/* Your existing routes */}
                <Route index element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
                <Route path={FRONTEND_PATHS.LOGIN} element={<LoginPage />} />
                <Route path={FRONTEND_PATHS.LOGOUT} element={<LogoutPage />} />
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
                <Route path={FRONTEND_PATHS.PRIVACY_NOTICE} element={<PrivacyNoticePage />} />
              </Route>
            </Routes>
          </PrescriptionInformationProvider>
        </PatientDetailsProvider>
      </AccessProvider>
    </AuthProvider>
  )
}
