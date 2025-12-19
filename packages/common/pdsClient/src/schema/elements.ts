import {JSONSchema} from "json-schema-to-ts"

export enum ResourceType {
  BUNDLE = "Bundle",
  OPERATION_OUTCOME = "OperationOutcome",
  PATIENT = "Patient"
}

export const period = {
  type: "object",
  properties: {
    start: {type: "string"},
    end: {type: "string"}
  },
  required: ["start"]
} as const satisfies JSONSchema
