import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthProvider";
import { AccessProvider } from "@/context/AccessProvider";
import Layout from "@/Layout";

import LoginPage from "@/pages/LoginPage";
import LogoutPage from "@/pages/LogoutPage";
import SelectYourRolePage from "@/pages/SelectYourRolePage";
import ChangeRolePage from "@/pages/ChangeRolePage";
import SearchPrescriptionPage from "@/pages/SearchPrescriptionPage";
import YourSelectedRolePage from "@/pages/YourSelectedRolePage";
import NotFoundPage from "@/pages/NotFoundPage";
import PrescriptionListPage from "@/pages/PrescriptionListPage";

export default function App() {

  return (
    <AuthProvider>
      <AccessProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<NotFoundPage />} />
            <Route path='*' element={<NotFoundPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="logout" element={<LogoutPage />} />
            <Route path="select-role" element={<SelectYourRolePage />} />
            <Route path="selected-role" element={<YourSelectedRolePage />} />
            <Route path="change-role" element={<ChangeRolePage />} />
            <Route
              path="search"
              element={<SearchPrescriptionPage />}
            />
            <Route
              path="prescription-results"
              element={<PrescriptionListPage />}
            />
          </Route>
        </Routes>
      </AccessProvider>
    </AuthProvider >
  );
}
