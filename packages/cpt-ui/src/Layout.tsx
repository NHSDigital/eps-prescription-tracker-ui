import {Outlet} from "react-router-dom"
import EpsHeader from "@/components/EpsHeader"
import RBACBanner from "@/components/RBACBanner"
import EpsFooter from "@/components/EpsFooter"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"
import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"
import {Fragment, ReactNode} from "react"

export default function Layout({children}: {children?: ReactNode}) {
  return (
    <Fragment>
      <EpsHeader />
      {!children && <PatientDetailsBanner />}
      {!children && <PrescriptionInformationBanner />}
      {children ?? <Outlet />}
      <RBACBanner />
      <EpsFooter />
    </Fragment>
  )
}
