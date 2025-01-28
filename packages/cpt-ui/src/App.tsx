// import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { AccessProvider } from "./context/AccessProvider";
import Layout from "./components/Layout";

// import { AuthContext } from "./context/AuthProvider";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import LogoutPage from "./pages/LogoutPage";
import SelectYourRolePage from "./pages/SelectYourRolePage";
import ChangeRolePage from "./pages/ChangeRolePage";
import ConfirmRolePage from "./pages/ConfirmRolePage";
import SearchPrescriptionPage from "./pages/SearchPrescriptionPage";
import YourSelectedRolePage from "./pages/YourSelectedRolePage";
// import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  // const auth = useContext(AuthContext);
  // const isSignedIn = auth?.isSignedIn;

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
            <Route path="confirmrole" element={<ConfirmRolePage />} />
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
