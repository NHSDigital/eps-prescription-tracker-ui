import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react"
import {useLocation} from "react-router-dom"

import {PatientSummary} from "@cpt-ui-common/common-types"
import {normalizePath} from "@/helpers/utils"
import {FRONTEND_PATHS} from "@/constants/environment"
import {logger} from "@/helpers/logger"

export type PatientDetailsContextType = {
  patientDetails: PatientSummary | undefined
  patientFallback: boolean
  setPatientDetails: (value: PatientSummary | undefined) => void
  setPatientFallback: (value: boolean) => void
  clear: () => void
}

export const PatientDetailsContext = createContext<PatientDetailsContextType | undefined>(
  undefined
)

export const PatientDetailsProvider = ({children}: {children: ReactNode}) => {
  const location = useLocation()
  const [patientDetails, setPatientDetails] = useState<PatientSummary | undefined>(undefined)
  const [patientFallback, setPatientFallback] = useState<boolean>(true)

  const clear = () => {
    logger.info("Clearing patient details context...")
    setPatientDetails(undefined)
    setPatientFallback(true)
  }

  // Clear the patient details if the user navigates away from the pages about the patient
  useEffect(() => {
    const patientDetailsAllowedPaths = [
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      FRONTEND_PATHS.PRESCRIPTION_LIST_PAST,
      FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE,
      FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE
    ]

    const path = normalizePath(location.pathname)
    if (!patientDetailsAllowedPaths.includes(path)) {
      logger.info("Clearing patient details.")
      clear()
    }
  }, [location.pathname])

  return (
    <PatientDetailsContext.Provider
      value={{
        patientDetails,
        patientFallback,
        setPatientDetails,
        setPatientFallback,
        clear
      }}
    >
      {children}
    </PatientDetailsContext.Provider>
  )
}

export const usePatientDetails = () => {
  const context = useContext(PatientDetailsContext)
  if (!context) {
    throw new Error("usePatientDetails must be used within an PatientDetailsProvider")
  }
  return context
}
