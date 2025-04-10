export interface PrescriptionDetails {
  prescriptionId: string
  issueDate: string
  status: string
  type: string
  isERD?: boolean
  instanceNumber?: number
  maxRepeats?: number
  daysSupply?: number
}
