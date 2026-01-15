import {FromSchema, JSONSchema} from "json-schema-to-ts"
import {ResourceType} from "../../schema/elements"
import {restrictedPatientResourceSchema, unrestrictedPatientResourceSchema} from "../../schema/patient"

const successfulResponseSchema = {
  type: "object",
  properties: {
    resourceType: {const: ResourceType.BUNDLE},
    total: {type: "integer", minimum: 1},
    entry: {
      type: "array",
      items: {
        type: "object",
        properties: {
          resource: {
            anyOf: [
              restrictedPatientResourceSchema,
              unrestrictedPatientResourceSchema
            ]
          }
        },
        required: ["resource"]
      },
      minItems: 1
    }
  },
  required: ["resourceType", "total", "entry"]
} as const satisfies JSONSchema
export type SuccessfulResponse = FromSchema<typeof successfulResponseSchema>

const emptySearchResponseSchema = {
  type: "object",
  properties: {
    resourceType: {const: ResourceType.BUNDLE},
    total: {const: 0}
  },
  required: ["resourceType", "total"]
} as const satisfies JSONSchema

const tooManyMatchesResponseSchema = {
  type: "object",
  properties: {
    resourceType: {const: ResourceType.OPERATION_OUTCOME},
    issue: {
      type: "array",
      items: {
        type: "object",
        properties: {
          details: {
            type: "object",
            properties: {
              coding: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    code: {const: "TOO_MANY_MATCHES"}
                  }
                }
              }
            },
            required: ["coding"]
          }
        },
        required: ["details"]
      },
      minItems: 1
    }
  },
  required: ["resourceType", "issue"]
} as const satisfies JSONSchema

export const pdsPatientSearchResponseSchema = {
  type: "object",
  oneOf: [
    tooManyMatchesResponseSchema,
    emptySearchResponseSchema,
    successfulResponseSchema
  ]
} as const satisfies JSONSchema
export type PDSPatientSearchResponse = FromSchema<typeof pdsPatientSearchResponseSchema>
