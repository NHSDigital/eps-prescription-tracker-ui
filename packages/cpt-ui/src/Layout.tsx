import {Outlet} from "react-router-dom"
import EpsHeader from "@/components/EpsHeader"
import RBACBanner from "@/components/RBACBanner"
import EpsFooter from "@/components/EpsFooter"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"
import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"

export default function Layout() {
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
