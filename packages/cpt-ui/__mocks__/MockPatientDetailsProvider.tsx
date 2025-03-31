import {jest} from "@jest/globals"

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
  const setPatientDetails = jest.fn()
  const clear = jest.fn()

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
