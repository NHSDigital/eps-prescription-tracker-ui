export {}

declare global {
  interface Window {
    __mockedPatientDetails?: import("@/context/PatientDetailsProvider").PatientDetailsContextType["patientDetails"]
    __mockedPrescriptionInformation?: import("@/context/PrescriptionInformationProvider").PrescriptionInformation | undefined // eslint-disable-line max-len
  }
}
