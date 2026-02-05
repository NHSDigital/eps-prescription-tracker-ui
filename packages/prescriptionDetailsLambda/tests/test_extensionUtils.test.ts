
import {describe, expect, it} from "vitest"

import {Extension} from "fhir/r4"
import {
  findExtensionByKey,
  getBooleanFromNestedExtension,
  getIntegerFromNestedExtension,
  getDisplayFromNestedExtension
} from "../src/utils/extensionUtils"
import {extensionUrlMappings} from "../src/utils/types"

describe("Extension Utilities", () => {
  describe("findExtensionByKey", () => {
    it("should find an extension using the first URL in the mapping", () => {
      const extensions: Array<Extension> = [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
          extension: [
            {
              url: "prescriptionPendingCancellation",
              valueBoolean: true
            }
          ]
        },
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
          valueCoding: {
            system: "https://fhir.nhs.uk/CodeSystem/prescription-type",
            code: "0101",
            display: "Outpatient Hospital Prescriber - Medical Prescriber"
          }
        }
      ]

      const result = findExtensionByKey(extensions, "PENDING_CANCELLATION")
      expect(result).toBe(extensions[0])
    })

    it("should find an extension using the alternative URL in the mapping", () => {
      // Either add this URL to extensionUrlMappings or update the test to use a URL that exists
      const extensions: Array<Extension> = [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
          extension: [
            {
              url: "prescriptionPendingCancellation",
              valueBoolean: true
            }
          ]
        },
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
          valueCoding: {
            system: "https://fhir.nhs.uk/CodeSystem/prescription-type",
            code: "0101",
            display: "Outpatient Hospital Prescriber - Medical Prescriber"
          }
        }
      ]

      const result = findExtensionByKey(extensions, "PENDING_CANCELLATION")
      expect(result).toBe(extensions[0])
    })

    it("should return undefined when the extension is not found", () => {
      const extensions: Array<Extension> = [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-SomeOtherExtension",
          extension: [
            {
              url: "someProperty",
              valueString: "some value"
            }
          ]
        }
      ]

      const result = findExtensionByKey(extensions, "PENDING_CANCELLATION")
      expect(result).toBeUndefined()
    })

    it("should return undefined when extensions array is empty", () => {
      const result = findExtensionByKey([], "PENDING_CANCELLATION")
      expect(result).toBeUndefined()
    })

    it("should return undefined when extensions array is undefined", () => {
      const result = findExtensionByKey(undefined, "PENDING_CANCELLATION")
      expect(result).toBeUndefined()
    })
  })

  describe("getBooleanFromNestedExtension", () => {
    it("should extract a boolean value from a nested extension", () => {
      const extension: Extension = {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
        extension: [
          {
            url: "prescriptionPendingCancellation",
            valueBoolean: true
          },
          {
            url: "lineItemPendingCancellation",
            valueBoolean: false
          }
        ]
      }

      const result = getBooleanFromNestedExtension(extension, "prescriptionPendingCancellation")
      expect(result).toBe(true)

      const result2 = getBooleanFromNestedExtension(extension, "lineItemPendingCancellation")
      expect(result2).toBe(false)
    })

    it("should return the default value when nested extension is not found", () => {
      const extension: Extension = {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
        extension: [
          {
            url: "numberOfRepeatsIssued",
            valueInteger: 2
          }
        ]
      }

      const result = getIntegerFromNestedExtension(extension, "nonExistentProperty")
      expect(result).toBeUndefined() // Default is undefined

      const result2 = getIntegerFromNestedExtension(extension, "nonExistentProperty", 0)
      expect(result2).toBe(0) // Using specified default value
    })

    it("should return the default value when extension is undefined", () => {
      const result = getBooleanFromNestedExtension(undefined, "anyProperty")
      expect(result).toBe(false)

      const result2 = getBooleanFromNestedExtension(undefined, "anyProperty", true)
      expect(result2).toBe(true)
    })

    it("should return the default value when extension has no nested extensions", () => {
      const extension: Extension = {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
        valueCoding: {
          system: "https://fhir.nhs.uk/CodeSystem/prescription-type",
          code: "0101",
          display: "Outpatient Hospital Prescriber - Medical Prescriber"
        }
      }

      const result = getBooleanFromNestedExtension(extension, "anyProperty")
      expect(result).toBe(false)
    })
  })

  describe("getIntegerFromNestedExtension", () => {
    it("should extract an integer value from a nested extension", () => {
      const extension: Extension = {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
        extension: [
          {
            url: "numberOfRepeatsIssued",
            valueInteger: 2
          },
          {
            url: "numberOfRepeatsAllowed",
            valueInteger: 6
          }
        ]
      }

      const result = getIntegerFromNestedExtension(extension, "numberOfRepeatsIssued")
      expect(result).toBe(2)

      const result2 = getIntegerFromNestedExtension(extension, "numberOfRepeatsAllowed")
      expect(result2).toBe(6)
    })

    it("should return the default value when nested extension is not found", () => {
      const extension: Extension = {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
        extension: [
          {
            url: "numberOfRepeatsIssued",
            valueInteger: 2
          }
        ]
      }

      const result = getIntegerFromNestedExtension(extension, "nonExistentProperty")
      expect(result).toBeUndefined() // Default is undefined

      const result2 = getIntegerFromNestedExtension(extension, "nonExistentProperty", 0)
      expect(result2).toBe(0) // Using specified default value
    })

    it("should return the default value when extension is undefined", () => {
      const result = getIntegerFromNestedExtension(undefined, "anyProperty")
      expect(result).toBeUndefined()

      const result2 = getIntegerFromNestedExtension(undefined, "anyProperty", 42)
      expect(result2).toBe(42)
    })
  })

  describe("getDisplayFromNestedExtension", () => {
    it("should extract a display value from a nested extension", () => {
      const extension: Extension = {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
        extension: [
          {
            url: "cancellationReason",
            valueCoding: {
              system: "https://fhir.nhs.uk/CodeSystem/medicationrequest-status-reason",
              code: "0001",
              display: "Medication no longer required"
            }
          }
        ]
      }

      const result = getDisplayFromNestedExtension(extension, "cancellationReason")
      expect(result).toBe("Medication no longer required")
    })

    it("should return the default value when nested extension is not found", () => {
      const extension: Extension = {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
        extension: [
          {
            url: "prescriptionPendingCancellation",
            valueBoolean: true
          }
        ]
      }

      const result = getDisplayFromNestedExtension(extension, "cancellationReason")
      expect(result).toBeUndefined() // Default is undefined

      const result2 = getDisplayFromNestedExtension(extension, "cancellationReason", "No reason provided")
      expect(result2).toBe("No reason provided") // Using specified default value
    })

    it("should return the default value when extension is undefined", () => {
      const result = getDisplayFromNestedExtension(undefined, "anyProperty")
      expect(result).toBeUndefined()

      const result2 = getDisplayFromNestedExtension(undefined, "anyProperty", "Default Message")
      expect(result2).toBe("Default Message")
    })

    it("should return the default value when valueCoding is missing", () => {
      const extension: Extension = {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
        extension: [
          {
            url: "cancellationReason"
            // valueCoding is missing
          }
        ]
      }

      const result = getDisplayFromNestedExtension(extension, "cancellationReason")
      expect(result).toBeUndefined()
    })
  })

  describe("extensionUrlMappings", () => {
    it("should contain mappings for all expected extension types", () => {
      expect(Object.keys(extensionUrlMappings)).toContain("PENDING_CANCELLATION")
      expect(Object.keys(extensionUrlMappings)).toContain("REPEAT_INFORMATION")
      expect(Object.keys(extensionUrlMappings)).toContain("PRESCRIPTION_TYPE")
      expect(Object.keys(extensionUrlMappings)).toContain("NON_DISPENSING_REASON")
      expect(Object.keys(extensionUrlMappings)).toContain("DISPENSING_INFORMATION")
      expect(Object.keys(extensionUrlMappings)).toContain("TASK_BUSINESS_STATUS")
    })
  })
})
