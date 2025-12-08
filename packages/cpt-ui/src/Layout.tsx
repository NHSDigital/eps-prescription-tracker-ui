import {Outlet} from "react-router-dom"
import RBACBanner from "@/components/RBACBanner"
import EpsFooter from "@/components/EpsFooter"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"
import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"
import {Fragment} from "react"
import EpsHeader from "./components/EpsHeader"

export default function Layout() {
  return (
    <Fragment>
      <EpsHeader />
      <PatientDetailsBanner />
      <PrescriptionInformationBanner />
      <Outlet />
      <RBACBanner />
      <EpsFooter />
    </Fragment>
  )
}
