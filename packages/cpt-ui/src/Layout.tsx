import {Outlet} from "react-router-dom"
import EpsHeader from "@/components/EpsHeader"
import RBACBanner from "@/components/RBACBanner"
import EpsFooter from "@/components/EpsFooter"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"

export default function Layout() {
  return (
    <>
      <EpsHeader />
      <PatientDetailsBanner />
      <Outlet />
      <RBACBanner />
      <EpsFooter />
    </>
  )
}
