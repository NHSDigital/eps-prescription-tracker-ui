import {Extension} from "fhir/r4"
import {
  ApigeeDataResponse,
  extensionUrlMappings,
  FhirAction,
  FhirParticipant
} from "./types"
import {Logger} from "@aws-lambda-powertools/logger"

/**
 * Extract ODS codes from the Apigee response.
 */
export function extractOdsCodes(apigeeData: ApigeeDataResponse, logger: Logger): {
  prescribingOrganization: string | undefined
  nominatedPerformer: string | undefined
  dispensingOrganizations: Array<string> | undefined
} {
  const prescribingOrganization = apigeeData?.author?.identifier?.value ?? undefined

  const nominatedPerformer = apigeeData?.action
    ?.find((action: FhirAction) =>
      action.participant?.some((participant: FhirParticipant) =>
        participant.identifier?.system === "https://fhir.nhs.uk/Id/ods-organization-code"
      )
    )?.participant?.[0]?.identifier?.value ?? undefined

  // Extract dispensing organizations' ODS codes
  const dispensingOrganizations: Array<string> = apigeeData?.action
    ?.flatMap((action: FhirAction) => action.action ?? []) // Flatten nested actions
    ?.filter((nestedAction) =>
      nestedAction.title === "Dispense notification successful" // Only select dispensing events
    )
    ?.map((dispenseAction: FhirAction) => dispenseAction.participant?.[0]?.identifier?.value ?? "")
    ?.filter(odsCode => odsCode) ?? [] // Remove empty values

  logger.info("Extracted ODS codes from Apigee", {prescribingOrganization, nominatedPerformer, dispensingOrganizations})

  return {
    prescribingOrganization,
    nominatedPerformer,
    dispensingOrganizations: dispensingOrganizations.length ? dispensingOrganizations : undefined
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
export const getIntegerFromNestedExtension = (
  extension: Extension | undefined,
  subUrl: string,
  defaultValue: number | string = "Not found"
): number | string => {
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
