// Coding type used for different code systems
export interface Coding {
  system: string
  code: string
  display: string
}

// Identifier type for entities like author or patient
export interface Identifier {
  system: string
  value: string
}

// Extension type for additional information
export interface Extension {
  url: string
  valueString?: string
  valueInteger?: number
  extension?: Array<Extension>
}

// Resource type for prescription details
export interface Resource {
  resourceType: string
  intent?: string
  status?: string
  medicationCodeableConcept?: {
    coding: Array<Coding>
  }
  groupIdentifier?: {
    system: string
    value: string
  }
  code?: {
    coding: Array<Coding>
  }
  author?: {
    reference: string
    identifier: Identifier
  }
  extension?: Array<Extension>
  dosageInstruction?: Array<{
    text: string
  }>
  dispenseRequest?: {
    quantity?: {
      value: number
    }
  }
  businessStatus?: {
    coding: Array<Coding>
  }
  output?: Array<{
    type: {
      coding: Array<Coding>
    }
    valueReference: {
      reference: string
    }
  }>
  authoredOn?: string
}

// Entry type within prescription details
export interface Entry {
  resource: Resource
}

// Root type for prescription details response
export interface PrescriptionDetails {
  resourceType: string
  type: string
  entry: Array<Entry>
}

// Type for contact information in DoHS data
export interface Contact {
  ContactType: string
  ContactAvailabilityType: string
  ContactMethodType: string
  ContactValue: string
}

// Type for organization information in DoHS data
export interface DoHSValue {
  OrganisationName: string
  ODSCode: string
  Address1: string
  City: string
  Postcode: string
  Contacts: Array<Contact>
}

// Root type for DoHS response
export interface DoHSData {
  value?: Array<DoHSValue>
}

// Type for merged response
export interface MergedResponse {
  patientDetails: {
    gender: string
    dateOfBirth: string
    address: string
  }
  prescriptionID: string
  typeCode: string
  statusCode: string
  issueDate: string
  instanceNumber: number | string
  maxRepeats: number | string
  daysSupply: string
  prescriptionPendingCancellation: boolean
  prescribedItems: Array<{
    itemDetails: {
      medicationName: string
      quantity: string
      dosageInstructions: string
      epsStatusCode: string
      nhsAppStatus?: string
      itemPendingCancellation: boolean
      cancellationReason?: string | null
    }
  }>
  dispensedItems: Array<{
    itemDetails: {
      medicationName: string
      quantity: string
      dosageInstructions: string
      epsStatusCode: string
      nhsAppStatus?: string
      itemPendingCancellation: boolean
      cancellationReason?: string | null
    }
  }>
  messageHistory: Array<{
    messageCode: string
    sentDateTime: string
    organisationName: string
    organisationODS: string
    newStatusCode: string
    dispenseNotification?: Array<{
      ID: string
      medicationName: string
      quantity: string
      dosageInstruction: string
    }>
  }>
  prescriberOrganisation: {
    organisationSummaryObjective: {
      name: string
      odsCode: string
      address: string
      telephone: string
      prescribedFrom: string
    }
  }
  nominatedDispenser?: {
    organisationSummaryObjective: {
      name: string
      odsCode: string
      address: string
      telephone: string
    }
  }
  currentDispenser?: {
    organisationSummaryObjective: {
      name: string
      odsCode: string
      address: string
      telephone: string
    }
  }
}
