// Main response
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
    prescribedItems: PrescribedItem[];
    dispensedItems: DispensedItem[];
    messageHistory: Message[];
    prescriberOrganisation: PrescriberOrganisation;
    nominatedDispenser?: OrganisationWrapper;
    currentDispenser?: OrganisationWrapper[];
}

// Patient related interfaces
export interface PatientDetails {
    identifier: string;
    name: PersonName;
    gender: string;
    birthDate: string;
    address: Address;
}

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

// Prescribed items
export interface PrescribedItem {
    itemDetails: PrescribedItemDetails;
}

export interface PrescribedItemDetails {
    medicationName: string;
    quantity: string;
    dosageInstructions: string;
    epsStatusCode: string;
    nhsAppStatus?: string;
    itemPendingCancellation: boolean;
    cancellationReason?: string | null;
}

// Dispensed items
export interface DispensedItem {
    itemDetails: DispensedItemDetails;
}

export interface DispensedItemDetails {
    medicationName: string;
    quantity: string;
    dosageInstructions: string;
    epsStatusCode: string;
    nhsAppStatus?: string;
    itemPendingCancellation: boolean;
    cancellationReason?: string | null;
    notDispensedReason?: string | null;
    initiallyPrescribed?: InitiallyPrescribed;
}

export interface InitiallyPrescribed {
    medicationName: string;
    quantity: string;
    dosageInstructions: string;
}

// Message history and notifications
export interface Message {
    messageCode: string;
    sentDateTime: string;
    organisationName: string;
    organisationODS: string;
    newStatusCode: string;
    dispenseNotification?: DispenseNotification[];
}

export interface DispenseNotification {
    ID: string;
    medicationName: string;
    quantity: string;
    dosageInstruction: string;
}

// Organisation details for prescriber and dispensers
export interface Organisation {
    name: string;
    odsCode: string;
    address: string;
    telephone: string;
}

export interface PrescriberOrganisation {
    organisationSummaryObjective: PrescriberOrganisationSummary;
}

export interface PrescriberOrganisationSummary extends Organisation {
    prescribedFrom: string;
}

export interface OrganisationWrapper {
    organisationSummaryObjective: Organisation;
}
