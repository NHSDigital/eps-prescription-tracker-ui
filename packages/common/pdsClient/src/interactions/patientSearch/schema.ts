import {
  FromSchema,
  JSONSchema,
  wrapCompilerAsTypeGuard,
  $Compiler
} from "json-schema-to-ts"
import Ajv from "ajv"

enum PatientMetaCode {
  UNRESTRICTED = "U",
  RESTRICTED = "R",
  VERY_RESTRICTED = "V"
}

const PatientMetaCodeSchema = {
  type: "string",
  enum: Object.values(PatientMetaCode)
} as const satisfies JSONSchema

enum PatientNameUse {
  USUAL = "usual",
  TEMP = "temp",
  NICKNAME = "nickname",
  OLD = "old",
  MAIDEN = "maiden"
}

const PatientUsualNameSchema = {
  type: "object",
  properties: {
    use: {const: PatientNameUse.USUAL},
    given: {
      type: "array",
      items: {type: "string"}
    },
    family: {type: "string"}
  },
  required: ["use", "family"]
} as const satisfies JSONSchema

// Only the usual name is used by our API, hence the `anyOf`
const PatientNameSchema = {
  type: "object",
  anyOf: [
    PatientUsualNameSchema,
    {
      type: "object",
      properties: {
        use: {
          type: "string",
          enum: Object.values(PatientNameUse).filter((use) => use !== PatientNameUse.USUAL)
        }
      }
    }
  ]
} as const satisfies JSONSchema

type PatientName = FromSchema<typeof PatientNameSchema>

enum PatientGender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  UNKNOWN = "unknown"
}

const PatientGenderSchema = {
  type: "string",
  enum: Object.values(PatientGender)
} as const satisfies JSONSchema

enum PatientAddressUse {
  HOME = "home",
  TEMP = "temp",
  BILLING = "billing",
  WORK = "work"
}

const PatientHomeAddressSchema = {
  type: "object",
  properties: {
    use: {const: PatientAddressUse.HOME},
    line: {
      type: "array",
      items: {type: "string"}
    },
    postalCode: {type: "string"}
  },
  required: ["use"]
} as const satisfies JSONSchema

// Only the home address is used by our API, hence the `anyOf`
const PatientAddressSchema = {
  type: "object",
  anyOf: [
    PatientHomeAddressSchema,
    {
      type: "object",
      properties: {
        use: {
          type: "string",
          enum: Object.values(PatientAddressUse).filter((use) => use !== PatientAddressUse.HOME)
        }
      }
    }
  ]
} as const satisfies JSONSchema
type PatientAddress = FromSchema<typeof PatientAddressSchema>

const PatientSearchEntryResourceSchema = {
  type: "object",
  properties: {
    id: {type: "string"},
    meta: {
      type: "object",
      properties: {
        code: PatientMetaCodeSchema
      },
      required: ["code"]
    },
    name: {
      type: "array",
      items: PatientNameSchema,
      // PDS response will always contain a usual name
      contains: {
        type: "object",
        properties: {
          use: {const: PatientNameUse.USUAL}
        }
      }
    },
    gender: PatientGenderSchema,
    birthDate: {type: "string"},
    address: {
      type: "array",
      items: PatientAddressSchema,
      // PDS response will always contain a home address
      contains: {
        type: "object",
        properties: {
          use: {const: PatientAddressUse.HOME}
        }
      }
    }
  },
  required: ["id", "meta", "name", "gender", "birthDate", "address"]
} as const satisfies JSONSchema

const PatientSearchEntrySchema = {
  type: "object",
  properties: {
    fullUrl: {type: "string"},
    resource: PatientSearchEntryResourceSchema
  },
  required: ["fullUrl", "resource"]
} as const satisfies JSONSchema
type PatientSearchEntry = FromSchema<typeof PatientSearchEntrySchema>

const PatientSearchResponseSchema = {
  type: "object",
  properties: {
    resourceType: {type: "string", enum: ["Bundle"]},
    entry: {
      type: "array",
      items: PatientSearchEntrySchema
    }
  },
  required: ["resourceType", "entry"]
} as const satisfies JSONSchema
type PatientSearchResponse = FromSchema<typeof PatientSearchResponseSchema>

const OperationOutcomeSchema = {
  type: "object",
  properties: {
    resourceType: {type: "string", enum: ["OperationOutcome"]},
    issue: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: {type: "string"}
        },
        required: ["code"]
      },
      minItems: 1
    }
  },
  required: ["issue"]
} as const satisfies JSONSchema

const PDSResponseSchema = {
  type: "object",
  oneOf: [
    PatientSearchResponseSchema,
    OperationOutcomeSchema
  ]
} as const satisfies JSONSchema
type PDSResponse = FromSchema<typeof PDSResponseSchema>

const $compile: $Compiler = (schema) => {
  const validate = new Ajv().compile(schema)
  return ((data: unknown) => validate(data) as boolean)
}
const compile = wrapCompilerAsTypeGuard($compile)

const responseValidator = compile(PDSResponseSchema)

export {
  PatientMetaCode,
  PatientName,
  PatientNameUse,
  PatientAddress,
  PatientAddressUse,
  PDSResponse,
  responseValidator,
  PatientSearchResponse,
  PatientSearchEntry
}
