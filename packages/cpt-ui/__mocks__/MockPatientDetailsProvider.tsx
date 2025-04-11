import React, {ReactNode} from "react"
import {PatientDetailsContext, PatientDetailsContextType} from "@/context/PatientDetailsProvider"

type MockPatientDetailsProviderProps = {
  children: ReactNode
  patientDetails?: PatientDetailsContextType["patientDetails"]
}

export const MockPatientDetailsProvider = ({
  children,
  patientDetails = undefined
}: MockPatientDetailsProviderProps) => {
  const setPatientDetails: PatientDetailsContextType["setPatientDetails"] = (details) => {
    window.__mockedPatientDetails = details
  }

  const clear: PatientDetailsContextType["clear"] = () => {
    window.__mockedPatientDetails = undefined
  }

  const value: PatientDetailsContextType = {
    patientDetails,
    setPatientDetails,
    clear
  }

  return (
    <PatientDetailsContext.Provider value={value}>
      {children}
    </PatientDetailsContext.Provider>
  )
}
