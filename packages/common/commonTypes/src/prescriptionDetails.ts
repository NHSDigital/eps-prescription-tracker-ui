// Patient Details
export interface PersonName {
    prefix?: string;
    given: string;
    family: string;
    suffix?: string;
}

export interface Address {
    text: string;
    line: string;
    city: string;
    district: string;
    postalCode: string;
    type: string;
    use: string;
}

export interface PatientDetails {
    identifier: string;
    name: PersonName;
    gender: string;
    birthDate: string;
    address: Address;
}

// Item Details for Prescribed Items
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
    prescribedFrom: string;
}

export interface PrescriberOrganisation {
    organisationSummaryObjective: PrescriberOrganisationSummary;
}

export interface DispenserOrganisation {
    organisationSummaryObjective: OrganisationSummary;
}

// Main Response Interface
export interface PrescriptionDetailsResponse {
    patientDetails: PatientDetails;
    prescriptionID: string;
    typeCode: string;
    statusCode: string;
    issueDate: string;
    instanceNumber: number | string;
    maxRepeats: number | string;
    daysSupply: string;
    prescriptionPendingCancellation: boolean;
    prescribedItems: Array<PrescribedItem>;
    dispensedItems: Array<DispensedItem>;
    messageHistory: Array<MessageHistory>;
    prescriberOrganisation: PrescriberOrganisation;
    nominatedDispenser?: DispenserOrganisation;
    currentDispenser?: Array<DispenserOrganisation>;
}
