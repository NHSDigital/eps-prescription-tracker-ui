import {FromSchema, JSONSchema} from "json-schema-to-ts"
import {period} from "./elements"

export enum PatientAddressUse {
  HOME = "home",
  TEMP = "temp",
  BILLING = "billing",
  WORK = "work"
}

export const patientAddressSchema = {
  type: "object",
  properties: {
    use: {enum: Object.values(PatientAddressUse)},
    period,
    line: {
      type: "array",
      items: {type: "string"}
    },
    postalCode: {type: "string"}
  },
  required: ["use"]
} as const satisfies JSONSchema
export type PatientAddress = FromSchema<typeof patientAddressSchema>
