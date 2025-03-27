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
            <Route path="select-your-role" element={<SelectYourRolePage />} />
            <Route path="your-your-selected-role" element={<YourSelectedRolePage />} />
            <Route path="change-your-role" element={<ChangeRolePage />} />
            <Route
              path="search-by-prescription-id"
              element={<SearchPrescriptionPage SearchMode="prescription-id" />}
            />
            <Route
              path="search-by-nhs-number"
              element={<SearchPrescriptionPage SearchMode={"nhs-number"} />}
            />
            <Route
              path="search-by-basic-details"
              element={<SearchPrescriptionPage SearchMode={"basic-details"} />}
            />
            <Route
              path="prescription-list"
              element={<PrescriptionListPage />}
            />
          </Route>
        </Routes>
      </AccessProvider>
    </AuthProvider >
  );
}
