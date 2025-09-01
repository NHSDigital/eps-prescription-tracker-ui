import {Navigate, Outlet, useLocation} from "react-router-dom"
import EpsHeader from "@/components/EpsHeader"
import RBACBanner from "@/components/RBACBanner"
import EpsFooter from "@/components/EpsFooter"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"
import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"
import {FRONTEND_PATHS} from "./constants/environment"
import {useAuth} from "./context/AuthProvider"
import {normalizePath} from "./helpers/utils"

export default function Layout() {
  const auth = useAuth()
  const location = useLocation()

  // render guard - prevents authenticated UI from showing when not signed in
  const currentPath = normalizePath(location.pathname)
  const publicPaths = [
    FRONTEND_PATHS.LOGIN,
    FRONTEND_PATHS.LOGOUT,
    FRONTEND_PATHS.COOKIES,
    FRONTEND_PATHS.PRIVACY_NOTICE,
    FRONTEND_PATHS.COOKIES_SELECTED,
    "/",
    "/notfound"
  ]

  // if not authorised and trying to access protected content, redirect
  if (!auth.isSignedIn && !auth.isSigningIn && !publicPaths.includes(currentPath)) {
    return <Navigate to={FRONTEND_PATHS.LOGIN} replace />
  }

  return (
    <>
      <EpsHeader />
      <PatientDetailsBanner />
      <PrescriptionInformationBanner />
      <Outlet />
      <RBACBanner />
      <EpsFooter />
    </>
  )
}
