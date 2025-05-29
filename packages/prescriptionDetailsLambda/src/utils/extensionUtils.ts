import {Extension} from "fhir/r4"
import {extensionUrlMappings} from "./types"

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
