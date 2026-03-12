import {Outlet, useLocation} from "react-router-dom"
import EpsHeader from "@/components/EpsHeader"
import RBACBanner from "@/components/RBACBanner"
import EpsFooter from "@/components/EpsFooter"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"
import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"
import {Fragment, ReactNode} from "react"
import {normalizePath} from "@/helpers/utils"
import {BANNER_ALLOWED_PATHS} from "@/constants/environment"

export default function Layout({children}: {children?: ReactNode}) {
  const location = useLocation()

  const currentPath = normalizePath(location.pathname)
  const shouldShowBanners = !children && BANNER_ALLOWED_PATHS.includes(currentPath)

  return (
    <Fragment>
      <EpsHeader />
      {shouldShowBanners && <PatientDetailsBanner />}
      {shouldShowBanners && <PrescriptionInformationBanner />}
      {children ?? <Outlet />}
      <RBACBanner />
      <EpsFooter />
    </Fragment>
  )
}
