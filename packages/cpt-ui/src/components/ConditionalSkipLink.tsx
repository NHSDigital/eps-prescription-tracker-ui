import React from "react"
import {useLocation} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {HEADER_SKIP_TO_MAIN_CONTENT} from "@/constants/ui-strings/HeaderStrings"

export default function ConditionalSkipLink() {
  const location = useLocation()

  // Define paths where skip link should go to patient details banner
  const patientDetailsPages = [
    FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
    FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE,
    FRONTEND_PATHS.PRESCRIPTION_LIST_PAST,
    FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE
  ]

  // Check if current path should target patient details banner
  const shouldTargetPatientDetails = patientDetailsPages.includes(location.pathname)

  const targetId = shouldTargetPatientDetails ? "#patient-details-banner" : "#main-content"

  return (
    <a
      href={targetId}
      className="nhsuk-skip-link"
      data-testid="eps_header_skipLink"
    >
      {HEADER_SKIP_TO_MAIN_CONTENT}
    </a>
  )
}
