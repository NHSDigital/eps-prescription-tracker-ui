import {
  Address,
  Coding,
  HumanName,
  Identifier,
  Extension
} from "fhir/r4"

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
  value?: Array<DoHSValue>
}

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
  currentDispenser?: {
    organisationSummaryObjective: {
      name: string
      odsCode: string
      address: string
      telephone: string
    }
  }
}
