import {FromSchema} from "json-schema-to-ts"
import {unrestrictedPatientResourceSchema} from "../../schema/patient"

export const successfulResponseSchema = unrestrictedPatientResourceSchema
export type SuccessfulResponse = FromSchema<typeof successfulResponseSchema>

// TODO: is this really needed?
// TODO: response should be restricted or not
