import {Outlet} from "react-router-dom"
import RBACBanner from "@/components/RBACBanner"
import EpsFooter from "@/components/EpsFooter"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"
import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"
import AppHeader from "@/components/AppHeader"
import {Fragment} from "react"

export default function Layout() {
  return (
    <Fragment>
      <AppHeader />
      <PatientDetailsBanner />
      <PrescriptionInformationBanner />
      <Outlet />
      <RBACBanner />
      <EpsFooter />
    </Fragment>
  )
}
