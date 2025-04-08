import React from "react"
import {
  PrescriptionInformationContext,
  PrescriptionInformationContextType
} from "@/context/PrescriptionInformationProvider"

export const MockPrescriptionInformationProvider = ({children}: {children: React.ReactNode}) => {
  const setPrescriptionInformation: PrescriptionInformationContextType["setPrescriptionInformation"] = (info) => {
    window.__mockedPrescriptionInformation = info
  }

  return (
    <PrescriptionInformationContext.Provider value={{prescriptionInformation: null, setPrescriptionInformation}}>
      {children}
    </PrescriptionInformationContext.Provider>
  )
}
