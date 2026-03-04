import {Outlet, useLocation} from "react-router-dom"
import EpsHeader from "@/components/EpsHeader"
import RBACBanner from "@/components/RBACBanner"
import EpsFooter from "@/components/EpsFooter"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"
import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"
import {Fragment, ReactNode} from "react"
import {FRONTEND_PATHS} from "@/constants/environment"
import {normalizePath} from "@/helpers/utils"

export default function Layout({children}: {children?: ReactNode}) {
  const location = useLocation()

  // Define pages where patient and prescription banners should be shown
  const bannerAllowedPaths = [
    FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
    FRONTEND_PATHS.PRESCRIPTION_LIST_PAST,
    FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE,
    FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE
  ]

  const currentPath = normalizePath(location.pathname)
  const shouldShowBanners = !children && bannerAllowedPaths.includes(currentPath)

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
