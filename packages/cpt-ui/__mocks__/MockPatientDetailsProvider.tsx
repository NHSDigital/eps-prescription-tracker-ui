import React, {ReactNode} from "react"
import {PatientDetailsContext, PatientDetailsContextType} from "@/context/PatientDetailsProvider"

type MockPatientDetailsProviderProps = {
  children: ReactNode
  patientDetails?: PatientDetailsContextType["patientDetails"]
  patientFallback?: PatientDetailsContextType["patientFallback"]
}

export const MockPatientDetailsProvider = ({
  children,
  patientDetails, //= undefined,
  patientFallback = true
}: MockPatientDetailsProviderProps) => {
  const setPatientDetails: PatientDetailsContextType["setPatientDetails"] = (details) => {
    window.__mockedPatientDetails = details
  }

  const setPatientFallback: PatientDetailsContextType["setPatientFallback"] = (fallback) => {
    window.__mockedPatientFallback = fallback
  }

  const clear: PatientDetailsContextType["clear"] = () => {
    window.__mockedPatientDetails = undefined
    window.__mockedPatientFallback = true
  }

  const value: PatientDetailsContextType = {
    patientDetails,
    patientFallback,
    setPatientDetails,
    setPatientFallback,
    clear
  }

  return (
    <PatientDetailsContext.Provider value={value}>
      {children}
    </PatientDetailsContext.Provider>
  )
}
