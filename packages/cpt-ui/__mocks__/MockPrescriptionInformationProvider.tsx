import React from "react"
import {
  PrescriptionInformationContext,
  PrescriptionInformationContextType
} from "@/context/PrescriptionInformationProvider"

export const MockPrescriptionInformationProvider = ({children}: {children: React.ReactNode}) => {
  const setPrescriptionInformation: PrescriptionInformationContextType["setPrescriptionInformation"] = (info) => {
    window.__mockedPrescriptionInformation = info
  }

  const clear: PrescriptionInformationContextType["clear"] = () => {
    window.__mockedPrescriptionInformation = undefined
  }

  return (
    <PrescriptionInformationContext.Provider
      value={{prescriptionInformation: undefined, setPrescriptionInformation, clear}}
    >
      {children}
    </PrescriptionInformationContext.Provider>
  )
}
