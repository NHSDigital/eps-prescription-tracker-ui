// import { useContext } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthProvider";
import { AccessProvider } from "@/context/AccessProvider";
import Layout from "@/Layout";

import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import LogoutPage from "@/pages/LogoutPage";
import SelectYourRolePage from "@/pages/SelectYourRolePage";
import ChangeRolePage from "@/pages/ChangeRolePage";
import SearchPrescriptionPage from "@/pages/SearchPrescriptionPage";
import YourSelectedRolePage from "@/pages/YourSelectedRolePage";
// import NotFoundPage from "./pages/NotFoundPage";

export default function App() {

  return (
    <AuthProvider>
      <AccessProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="logout" element={<LogoutPage />} />
            <Route path="selectyourrole" element={<SelectYourRolePage />} />
            <Route path="yourselectedrole" element={<YourSelectedRolePage />} />
            <Route path="changerole" element={<ChangeRolePage />} />
            <Route
              path="searchforaprescription"
              element={<SearchPrescriptionPage />}
            />
          </Route>
        </Routes>
      </AccessProvider>
    </AuthProvider>
  );
}
