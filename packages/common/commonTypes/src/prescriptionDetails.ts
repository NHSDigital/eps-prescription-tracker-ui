// export interface PersonName {
//     prefix?: string;
//     given: string;
//     family: string;
//     suffix?: string;
// }

// export interface Address {
//     // Following a conversation with Sean,
//     // I'm reluctant to assume ANYTHING is required for an address
//     text?: string;
//     line?: string;
//     city?: string;
//     district?: string;
//     postalCode?: string;
//     type: string;
//     use: string;
// }

// export interface PatientDetails {
//     identifier: string;
//     name: PersonName;
//     gender?: string;
//     birthDate?: string;
//     address?: Address;
// }

// TODO: The above is from PR 417 - but there's no reason to use two different definitions
// of the same data. Instead, use a common one between the two lambdas. The PR will need refactoring
import {PatientDetails} from "./prescriptionList"

export interface PrescribedItemDetails {
    medicationName: string;
    quantity: string;
    dosageInstructions: string;
    epsStatusCode: string;
    nhsAppStatus?: string;
    itemPendingCancellation: boolean;
    cancellationReason?: string | null;
}

export interface PrescribedItem {
    itemDetails: PrescribedItemDetails;
}

// Additional fields for Dispensed Items
export interface InitiallyPrescribed {
    medicationName: string;
    quantity: string;
    dosageInstructions: string;
}

export interface DispensedItemDetails extends PrescribedItemDetails {
    notDispensedReason?: string | null;
    initiallyPrescribed?: InitiallyPrescribed;
}

export interface DispensedItem {
    itemDetails: DispensedItemDetails;
}

// Message History and Notifications
export interface DispenseNotification {
    ID: string;
    medicationName: string;
    quantity: string;
    dosageInstruction: string;
}

export interface MessageHistory {
    messageCode: string;
    sentDateTime: string;
    organisationName: string;
    organisationODS: string;
    newStatusCode: string;
    dispenseNotification?: Array<DispenseNotification>;
}

// Organisation Details
export interface OrganisationSummary {
    name?: string;
    odsCode: string;
    address?: string;
    telephone?: string;
}

// The prescriber's organisation has an extra property
export interface PrescriberOrganisationSummary extends OrganisationSummary {
    prescribedFrom?: string;
}

export interface PrescriberOrganisation {
    organisationSummaryObjective: PrescriberOrganisationSummary;
}

export interface DispenserOrganisation {
    organisationSummaryObjective: OrganisationSummary;
}

// Complete response
export interface PrescriptionDetailsResponse {
    patientDetails: PatientDetails;
    prescriptionId: string;
    typeCode: string;
    statusCode: string;
    issueDate: string;
    instanceNumber: number | string;
    maxRepeats: number | string;
    // FIXME: This was added in https://github.com/NHSDigital/eps-prescription-tracker-ui/pull/670
    // and needs to be handled by https://github.com/NHSDigital/eps-prescription-tracker-ui/pull/417
    isERD?: boolean
    daysSupply: string;
    prescriptionPendingCancellation: boolean;
    prescribedItems: Array<PrescribedItem>;
    dispensedItems: Array<DispensedItem>;
    messageHistory: Array<MessageHistory>;
    prescriberOrganisation: PrescriberOrganisation;
    nominatedDispenser?: DispenserOrganisation;
    currentDispenser?: Array<DispenserOrganisation>;
}
