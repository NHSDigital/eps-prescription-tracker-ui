import {Routes, Route} from "react-router-dom"
import {lazy} from "react"
import {AuthProvider} from "@/context/AuthProvider"
import {AccessProvider} from "@/context/AccessProvider"
import {PatientDetailsProvider} from "./context/PatientDetailsProvider"
import {PrescriptionInformationProvider} from "./context/PrescriptionInformationProvider"
import Layout from "@/Layout"

const LoginPage = lazy(() => import("@/pages/LoginPage"))
const LogoutPage = lazy(() => import("@/pages/LogoutPage"))
const SelectYourRolePage = lazy(() => import("@/pages/SelectYourRolePage"))
const ChangeRolePage = lazy(() => import("@/pages/ChangeRolePage"))
const SearchPrescriptionPage= lazy(() => import("@/pages/SearchPrescriptionPage"))
const YourSelectedRolePage = lazy(() => import("@/pages/YourSelectedRolePage"))
const NotFoundPage = lazy(() => import( "@/pages/NotFoundPage"))
const PrescriptionListPage = lazy(() => import( "@/pages/PrescriptionListPage"))
const PrescriptionNotFoundPage = lazy(() => import( "@/pages/PrescriptionNotFoundPage"))
const PrescriptionDetailsPage = lazy(() => import( "@/pages/PrescriptionDetailsPage"))
const EPSCookieBanner = lazy(() => import( "./components/EPSCookieBanner"))
const CookiePolicyPage = lazy(() => import( "./pages/CookiePolicyPage"))
const CookieSettingsPage = lazy(() => import( "./pages/CookieSettingsPage"))
const SearchResultsPage = lazy(() => import( "@/pages/BasicDetailsSearchResultsPage"))

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
                <Route path={FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND} element={<PrescriptionNotFoundPage />} />
                <Route path={FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE} element={<PrescriptionDetailsPage />} />
                <Route path={FRONTEND_PATHS.PATIENT_SEARCH_RESULTS} element={<SearchResultsPage />} />
              </Route>
            </Routes>
          </PrescriptionInformationProvider>
        </PatientDetailsProvider>
      </AccessProvider>
    </AuthProvider>
  )
}
