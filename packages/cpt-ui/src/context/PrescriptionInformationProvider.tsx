import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react"
import {useLocation} from "react-router-dom"

import {normalizePath} from "@/helpers/utils"
import {FRONTEND_PATHS} from "@/constants/environment"

export interface PrescriptionInformation {
  prescriptionId: string
  issueDate: string
  status: string
  type: string
  daysSupply?: string
}

export type PrescriptionInformationContextType = {
  prescriptionInformation: PrescriptionInformation | undefined
  setPrescriptionInformation: (value: PrescriptionInformation) => void
  clear: () => void
}

export const PrescriptionInformationContext = createContext<PrescriptionInformationContextType | undefined>(undefined)

export const PrescriptionInformationProvider = ({children}: {children: ReactNode}) => {
  const location = useLocation()
  const [prescriptionInformation, setPrescriptionInformation] = useState<PrescriptionInformation | undefined>(undefined)

  const clear = () => {
    console.log("Clearing prescription information context...")
    setPrescriptionInformation(undefined)
  }

  useEffect(() => {
    const prescriptionInfoAllowedPaths = [
      FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE
    ]

    const path = normalizePath(location.pathname)
    if (!prescriptionInfoAllowedPaths.includes(path)) {
      console.info("Clearing prescription information.")
      clear()
    }
  }, [location.pathname])

  return (
    <PrescriptionInformationContext.Provider
      value={{
        prescriptionInformation,
        setPrescriptionInformation,
        clear
      }}
    >
      {children}
    </PrescriptionInformationContext.Provider>
  )
}

export const usePrescriptionInformation = () => {
  const context = useContext(PrescriptionInformationContext)
  if (!context) {
    throw new Error("usePrescriptionInformation must be used within a PrescriptionInformationProvider")
  }
  return context
}
