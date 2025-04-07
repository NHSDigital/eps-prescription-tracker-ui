import {Routes, Route} from "react-router-dom"
import {AuthProvider} from "@/context/AuthProvider"
import {AccessProvider} from "@/context/AccessProvider"
import {PatientDetailsProvider} from "./context/PatientDetailsProvider"
import Layout from "@/Layout"

import LoginPage from "@/pages/LoginPage"
import LogoutPage from "@/pages/LogoutPage"
import SelectYourRolePage from "@/pages/SelectYourRolePage"
import ChangeRolePage from "@/pages/ChangeRolePage"
import SearchPrescriptionPage from "@/pages/SearchPrescriptionPage"
import YourSelectedRolePage from "@/pages/YourSelectedRolePage"
import NotFoundPage from "@/pages/NotFoundPage"
import PrescriptionListPage from "@/pages/PrescriptionListPage"
import PrescriptionNotFoundPage from "@/pages/PrescriptionNotFoundPage"
import PrescriptionDetailsPage from "@/pages/PrescriptionDetailsPage"

import {FRONTEND_PATHS} from "@/constants/environment"

export default function App() {

  return (
    <AuthProvider>
      <AccessProvider>
        <PatientDetailsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<NotFoundPage />} />
              <Route path='*' element={<NotFoundPage />} />
              <Route path={FRONTEND_PATHS.LOGIN} element={<LoginPage />} />
              <Route path={FRONTEND_PATHS.LOGOUT} element={<LogoutPage />} />
              <Route path={FRONTEND_PATHS.SELECT_YOUR_ROLE} element={<SelectYourRolePage />} />
              <Route path={FRONTEND_PATHS.YOUR_SELECTED_ROLE} element={<YourSelectedRolePage />} />
              <Route path={FRONTEND_PATHS.CHANGE_YOUR_ROLE} element={<ChangeRolePage />} />
              <Route
                path={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID}
                element={<SearchPrescriptionPage />}
              />
              <Route
                path={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER}
                element={<SearchPrescriptionPage />}
              />
              <Route
                path={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS}
                element={<SearchPrescriptionPage />}
              />
              <Route
                path={FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}
                element={<PrescriptionListPage />}
              />
              <Route
                path={FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE}
                element={<PrescriptionListPage />}
              />
              <Route
                path={FRONTEND_PATHS.PRESCRIPTION_LIST_PAST}
                element={<PrescriptionListPage />}
              />
              <Route
                path={FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND}
                element={<PrescriptionNotFoundPage />}
              />
              <Route
                path={FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE}
                element={<PrescriptionDetailsPage />}
              />
            </Route>
          </Routes>
        </PatientDetailsProvider>
      </AccessProvider>
    </AuthProvider >
  )
}
