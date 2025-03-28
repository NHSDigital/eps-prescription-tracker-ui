import {Routes, Route} from "react-router-dom"
import {AuthProvider} from "@/context/AuthProvider"
import {AccessProvider} from "@/context/AccessProvider"
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

import {FRONTEND_PATHS} from "@/constants/environment"

export default function App() {

  return (
    <AuthProvider>
      <AccessProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<NotFoundPage />} />
            <Route path='*' element={<NotFoundPage />} />
            <Route path={FRONTEND_PATHS.LOGIN} element={<LoginPage />} />
            <Route path={FRONTEND_PATHS.LOGOUT} element={<LogoutPage />} />
            <Route path={FRONTEND_PATHS.SELECT_ROLE} element={<SelectYourRolePage />} />
            <Route path={FRONTEND_PATHS.SELECTED_ROLE} element={<YourSelectedRolePage />} />
            <Route path={FRONTEND_PATHS.CHANGE_ROLE} element={<ChangeRolePage />} />
            <Route
              path={FRONTEND_PATHS.SEARCH}
              element={<SearchPrescriptionPage />}
            />
            <Route
              path={FRONTEND_PATHS.PRESCRIPTION_RESULTS}
              element={<PrescriptionListPage />}
            />
            <Route
              path="prescription-not-found"
              element={<PrescriptionNotFoundPage />}
            />
          </Route>
        </Routes>
      </AccessProvider>
    </AuthProvider >
  )
}
