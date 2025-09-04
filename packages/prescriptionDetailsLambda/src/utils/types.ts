import {DoHSOrg} from "@cpt-ui-common/doHSClient"
import {Coding, Extension} from "fhir/r4"

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

// Root type for DoHS response
export interface DoHSData {
  prescribingOrganization?: DoHSOrg | null
  nominatedPerformer?: DoHSOrg | null
  dispensingOrganization?: DoHSOrg | null
}

/**
 * Map of canonical extension keys to their possible URLs.
 * This helps handle inconsistencies between different FHIR implementations.
 */
export const extensionUrlMappings = {
  PENDING_CANCELLATION: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation"
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
  ],
  PRESCRIPTION_STATUS_HISTORY: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PrescriptionStatusHistory"
  ],
  DM_PRESCRIPTION_STATUS_UPDATE_HISTORY: [
    "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionStatusHistory"
  ]
} satisfies Record<string, Array<string>>
