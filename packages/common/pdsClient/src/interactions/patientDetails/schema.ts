import {FromSchema, JSONSchema} from "json-schema-to-ts"
import {restrictedPatientResourceSchema, unrestrictedPatientResourceSchema} from "../../schema/patient"

export const pdsPatientDetailsResponseSchema = {
  type: "object",
  oneOf: [
    restrictedPatientResourceSchema,
    unrestrictedPatientResourceSchema
  ]
} as const satisfies JSONSchema
export type PDSPatientDetailsResponse = FromSchema<typeof pdsPatientDetailsResponseSchema>
