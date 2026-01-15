import {PatientSummary} from "./patientSearch"

export interface ItemDetails {
    medicationName: string
    quantity: string
    dosageInstructions?: string
    epsStatusCode: string
    pharmacyStatus?: string
    itemPendingCancellation: boolean
    cancellationReason?: string
    notDispensedReason?: string
}

export interface DispenseNotificationItemComponent {
    medicationName: string
    quantity: string
    dosageInstruction?: string
}

export interface DispenseNotificationItem {
    statusCode: string
    components: Array<DispenseNotificationItemComponent>
}

export interface MessageHistory {
    messageCode: string
    sentDateTime: string
    orgName?: string
    orgODS: string
    newStatusCode: string
    dispenseNotificationItems?: Array<DispenseNotificationItem>
}

// Organization Details
export interface OrgSummary {
    name?: string
    odsCode: string
    address?: string
    telephone?: string
    prescribedFrom?: string
}

// Complete response
export interface PrescriptionDetailsResponse {
    patientDetails: PatientSummary
    prescriptionId: string
    typeCode: "acute" | "continuous" | "continuous-repeat-dispensing"
    statusCode: string
    issueDate: string
    instanceNumber: number
    maxRepeats?: number
    daysSupply?: string
    prescriptionPendingCancellation: boolean
    items: Array<ItemDetails>
    messageHistory: Array<MessageHistory>
    prescriberOrg: OrgSummary
    nominatedDispenser?: OrgSummary
    currentDispenser?: OrgSummary
    cancellationReason?: string,
    nonDispensingReason?: string
}
