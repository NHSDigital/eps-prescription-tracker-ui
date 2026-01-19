import {FromSchema, JSONSchema} from "json-schema-to-ts"
import {period} from "./elements"
import {PatientNameUse} from "@cpt-ui-common/common-types"

export const patientNameSchema = {
  type: "object",
  properties: {
    use: {enum: Object.values(PatientNameUse)},
    period,
    given: {
      type: "array",
      items: {type: "string"}
    },
    family: {type: "string"}
  },
  required: ["use"]
} as const satisfies JSONSchema
export type PatientName = FromSchema<typeof patientNameSchema>
