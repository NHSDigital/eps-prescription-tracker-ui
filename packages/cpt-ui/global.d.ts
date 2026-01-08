export {}

declare global {
  interface Window {
    __mockedPatientDetails?: import("@/context/PatientDetailsProvider").PatientDetailsContextType["patientDetails"]
    __mockedPatientFallback?: import("@/context/PatientDetailsProvider").PatientDetailsContextType["patientFallback"]
    __mockedPrescriptionInformation?: import("@/context/PrescriptionInformationProvider").PrescriptionInformation | undefined // eslint-disable-line max-len

    NHSCookieConsent: {
      VERSION: string
      getPreferences: () => boolean
      getStatistics: () => boolean
      getMarketing: () => boolean
      getConsented: () => boolean
      setPreferences: (value: boolean) => void
      setStatistics: (value: boolean) => void
      setMarketing: (value: boolean) => void
      setConsented: (value: boolean) => void
    }
  }
}
