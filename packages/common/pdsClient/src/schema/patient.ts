import {FromSchema, JSONSchema} from "json-schema-to-ts"
import {PatientSummaryGender} from "@cpt-ui-common/common-types"

import {patientNameSchema} from "./name"
import {patientAddressSchema} from "./address"
import {ResourceType} from "./elements"

export enum PatientMetaCode {
  UNRESTRICTED = "U",
  RESTRICTED = "R",
  VERY_RESTRICTED = "V"
}

export const restrictedPatientResourceSchema = {
  type: "object",
  properties: {
    resourceType: {const: ResourceType.PATIENT},
    meta: {
      type: "object",
      properties: {
        security:{
          type: "array",
          items: {
            type: "object",
            properties: {
              code: {
                type: "string",
                enum: [
                  PatientMetaCode.RESTRICTED,
                  PatientMetaCode.VERY_RESTRICTED
                ]
              }
            },
            required: ["code"]
          },
          minItems: 1
        }
      },
      required: ["security"]
    }
  },
  required: ["resourceType", "meta"]
} as const satisfies JSONSchema
export type RestrictedPatient = FromSchema<typeof restrictedPatientResourceSchema>

export const unrestrictedPatientResourceSchema = {
  type: "object",
  properties: {
    resourceType: {const: ResourceType.PATIENT},
    meta: {
      type: "object",
      properties: {
        security:{
          type: "array",
          items: {
            type: "object",
            properties: {
              code: {const: PatientMetaCode.UNRESTRICTED}
            },
            required: ["code"]
          },
          minItems: 1
        }
      },
      required: ["security"]
    },
    id: {type: "string"},
    name: {
      type: "array",
      items: patientNameSchema
    },
    gender: {enum: Object.values(PatientSummaryGender)},
    birthDate: {type: "string"},
    address: {
      type: "array",
      items: patientAddressSchema
    }
  },
  required: ["resourceType", "meta", "id"]
} as const satisfies JSONSchema
export type UnrestrictedPatient = FromSchema<typeof unrestrictedPatientResourceSchema>
