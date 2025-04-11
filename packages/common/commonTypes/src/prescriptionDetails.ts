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

export interface PrescribedItemDetails {
  medicationName: string
  quantity: string
  dosageInstructions: string
  epsStatusCode: string
  nhsAppStatus?: string
  itemPendingCancellation: boolean
  cancellationReason?: string | null
}

export interface PrescribedItem {
  itemDetails: PrescribedItemDetails
}

// Additional fields for Dispensed Items
export interface InitiallyPrescribed {
  medicationName: string
  quantity: string
  dosageInstructions: string
}

export interface DispensedItemDetails extends PrescribedItemDetails {
  notDispensedReason?: string | null
  initiallyPrescribed?: InitiallyPrescribed
  pharmacyStatus?: string
}

export interface DispensedItem {
  itemDetails: DispensedItemDetails
}
