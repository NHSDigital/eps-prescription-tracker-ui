import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react"
import {useLocation} from "react-router-dom"

import {PatientDetails} from "@cpt-ui-common/common-types"
import {normalizePath} from "@/helpers/utils"

export type PatientDetailsContextType = {
    patientDetails: PatientDetails | undefined
    setPatientDetails: (value: PatientDetails) => void
    clear: () => void
}

export const PatientDetailsContext = createContext<PatientDetailsContextType | undefined>(
  undefined
)

export const PatientDetailsProvider = ({children}: { children: ReactNode }) => {
  const location = useLocation()
  const [patientDetails, setPatientDetails] = useState<PatientDetails | undefined>(undefined)

  const clear = () => {
    console.log("Clearing patient details context...")
    setPatientDetails(undefined)
  }

  // Clear the patient details if the user navigates away from the pages about the patient
  useEffect(() => {
    // TODO: Ensure this is up to date as pages get implemented!
    const patientDetailsAllowedPaths = [
      "/prescription-results"
      // "/prescription-details",
    ]

    const path = normalizePath(location.pathname)
    if (!patientDetailsAllowedPaths.includes(path)) {
      console.info("Clearing patient details.")
      clear()
    }
  }, [location.pathname])

  return (
    <PatientDetailsContext.Provider
      value={{
        patientDetails,
        setPatientDetails,
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
