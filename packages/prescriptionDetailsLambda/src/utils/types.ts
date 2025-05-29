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
 * Interface to define URL mappings for FHIR extensions.
 * This helps with handling different URL formats for the same extension.
 */
interface ExtensionUrlMappings {
  [key: string]: Array<string>
}

/**
 * Map of canonical extension keys to their possible URLs.
 * This helps handle inconsistencies between different FHIR implementations.
 */
export const extensionUrlMappings: ExtensionUrlMappings = {
  PENDING_CANCELLATION: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PendingCancellations"
  ],
  REPEAT_INFORMATION: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation"
  ],
  PRESCRIPTION_TYPE: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType"
  ],
  NON_DISPENSING_REASON: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionNonDispensingReason"
  ],
  DISPENSING_INFORMATION: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation"
  ],
  TASK_BUSINESS_STATUS: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-TaskBusinessStatus"
  ]
}
