/* eslint-disable max-len */

import {
  Bundle,
  Extension,
  MedicationRequest,
  RequestGroup
} from "fhir/r4"
import {extensionUrlMappings} from "./types"
import {Logger} from "@aws-lambda-powertools/logger"

export type PrescriptionOdsCodes = {
  prescribingOrganization: string
  nominatedPerformer: string | undefined
  dispensingOrganization: string | undefined
}

export const extractOdsCodes = (bundle: Bundle, logger: Logger): PrescriptionOdsCodes => {
  const requestGroup = bundle.entry!.find(e => e.resource!.resourceType === "RequestGroup")!.resource as RequestGroup
  const medicationRequests = bundle.entry!.filter(e => e.resource!.resourceType === "MedicationRequest").map(e => e.resource as MedicationRequest)

  const prescribingOrganization = requestGroup.author!.identifier!.value!

  // Handle performer identifier as array or single object
  let nominatedPerformer: string | undefined
  const performerIdentifiers = medicationRequests[0].dispenseRequest!.performer?.identifier
  if (Array.isArray(performerIdentifiers)) {
    const odsIdentifier = performerIdentifiers.find(id => id.system === "https://fhir.nhs.uk/Id/ods-organization-code")
    nominatedPerformer = odsIdentifier?.value
  } else {
    nominatedPerformer = performerIdentifiers?.value
  }

  const dispensingOrganization = requestGroup.action!
    .find(a => a.title === "Prescription status transitions")
    ?.action?.map(a => a?.participant?.[0]?.extension?.[0]?.valueReference?.identifier?.value)
    .reverse().find(odsCode => odsCode && odsCode !== prescribingOrganization)

  logger.info("Extracted ODS codes", {prescribingOrganization, nominatedPerformer, dispensingOrganization})

  return {
    prescribingOrganization,
    nominatedPerformer,
    dispensingOrganization
  }
}

/**
 * Finds an extension by any of its possible URLs.
 */
export const findExtensionByKey = (
  extensions: Array<Extension> | undefined,
  extensionKey: keyof typeof extensionUrlMappings
): Extension | undefined => {
  if (!extensions || extensions.length === 0) {
    return undefined
  }

  const possibleUrls = extensionUrlMappings[extensionKey]
  return extensions.find(ext => possibleUrls.includes(ext.url))
}

export const findExtensionsByKey = (
  extensions: Array<Extension> | undefined,
  extensionKey: keyof typeof extensionUrlMappings
): Array<Extension> => {
  if (!extensions || extensions.length === 0) {
    return []
  }

  const possibleUrls = extensionUrlMappings[extensionKey]
  return extensions.filter(ext => possibleUrls.includes(ext.url))
}

/**
 * Extracts a boolean value from a nested extension.
 */
export const getBooleanFromNestedExtension = (
  extension: Extension | undefined,
  subUrl: string,
  defaultValue = false
): boolean => {
  if (!extension || !extension.extension || extension.extension.length === 0) {
    return defaultValue
  }

  const nestedExt = extension.extension.find(ext => ext.url === subUrl)
  return nestedExt?.valueBoolean ?? defaultValue
}

/**
 * Extracts an integer value from a nested extension.
 */
export const getIntegerFromNestedExtension = <T = undefined>(
  extension: Extension | undefined,
  subUrl: string,
  defaultValue: T = undefined as T
): number | T => {
  if (!extension || !extension.extension || extension.extension.length === 0) {
    return defaultValue
  }

  const nestedExt = extension.extension.find(ext => ext.url === subUrl)
  return nestedExt?.valueInteger ?? defaultValue
}

/**
 * Extracts a display value from a coding in a nested extension.
 */
export const getDisplayFromNestedExtension = (
  extension: Extension | undefined,
  subUrl: string,
  defaultValue: string | undefined = undefined
): string | undefined => {
  if (!extension || !extension.extension || extension.extension.length === 0) {
    return defaultValue
  }

  const nestedExt = extension.extension.find(ext => ext.url === subUrl)
  return nestedExt?.valueCoding?.display ?? defaultValue
}

/**
 * Extracts a code value from a coding in a nested extension.
 */
export const getCodeFromNestedExtension = <T = undefined>(
  extension: Extension | undefined,
  subUrl: string,
  defaultValue: T = undefined as T
): string | T => {
  if (!extension || !extension.extension || extension.extension.length === 0) {
    return defaultValue
  }

  const nestedExt = extension.extension.find(ext => ext.url === subUrl)
  return nestedExt?.valueCoding?.code ?? defaultValue
}
