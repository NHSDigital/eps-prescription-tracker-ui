import {
  Address,
  Coding,
  HumanName,
  Identifier,
  Extension
} from "fhir/r4"

// Resource type for FHIR request group
export interface FhirAction {
  title?: string // Title of the action (e.g., "Dispense notification successful")
  timingDateTime?: string // Optional timing field
  timingTiming?: {
    event?: Array<string>
    repeat?: {
      frequency?: number
      period?: number
      periodUnit?: string
    }
  }
  participant?: Array<FhirParticipant> // List of participants (e.g., dispensing organizations)
  code?: Array<{
    coding?: Array<Coding>
  }>
  action?: Array<FhirAction> // Recursive reference for nested actions
  resource?: {reference?: string} // Single resource reference
}

export interface FhirIdentifier {
  system?: string
  value?: string
}

// Extend FhirParticipant to support nested extensions
export interface FhirParticipant {
  identifier?: {
    system?: string
    value?: string
  }
}

// Minimal type for the apigee response data format
export interface ApigeeDataResponse {
  author?: {
    identifier?: FhirIdentifier
  }
  action?: Array<FhirAction>
  // there might be other elements, but they're not necessary for us
}

// Extend FhirExtension to support nested extensions
export interface ExtensionWithNested extends Extension {
  extension?: Array<{
    url: string
    valueInteger?: number
    valueBoolean?: boolean
    valueCoding?: Coding
  }>
}

// Resource type for prescription details
export interface Resource {
  resourceType: string
  intent?: string
  status?: string
  identifier?: Array<Identifier>
  name?: Array<HumanName>
  gender?: string
  birthDate?: string
  address?: Array<Address>
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
  extension?: Array<ExtensionWithNested>
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
  prescribingOrganization?: DoHSValue | null
  nominatedPerformer?: DoHSValue | null
  dispensingOrganizations?: Array<DoHSValue>
}

// Defines the allowed prescription intent values based on FHIR standards.
export type PrescriptionIntent = "order" | "instance-order" | "reflex-order"

/**
 * The MergedResponse interface represents the consolidated information
 * from the Spine response and DoHS data. It is used to structure
 * the combined output of various data sources into a single, comprehensive
 * response format for easier consumption in the application.
 */
export interface MergedResponse {
  patientDetails: {
    identifier: string
    name: {
      prefix?: string
      given: string
      family: string
      suffix?: string
    }
    gender: string
    birthDate: string
    address: {
      text: string
      line: string
      city: string
      district: string
      postalCode: string
      type: string
      use: string
    }
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
      notDispensedReason?: string | null
      initiallyPrescribed?: {
        medicationName: string
        quantity: string
        dosageInstructions: string
      }
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
  currentDispenser?: Array<{
    organisationSummaryObjective: {
      name: string
      odsCode: string
      address: string
      telephone: string
    }
  }>
}
