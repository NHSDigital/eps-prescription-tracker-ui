import {FromSchema, JSONSchema} from "json-schema-to-ts"
import Ajv, {ErrorObject, ValidateFunction} from "ajv"

enum PatientMetaCode {
  UNRESTRICTED = "U",
  RESTRICTED = "R",
  VERY_RESTRICTED = "V"
}

enum PatientNameUse {
  USUAL = "usual",
  TEMP = "temp",
  NICKNAME = "nickname",
  OLD = "old",
  MAIDEN = "maiden"
}

enum PatientGender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  UNKNOWN = "unknown"
}

enum PatientAddressUse {
  HOME = "home",
  TEMP = "temp",
  BILLING = "billing",
  WORK = "work"
}

enum ResponseType {
  BUNDLE = "Bundle",
  OPERATION_OUTCOME = "OperationOutcome"
}

const PatientNameSchema = {
  type: "object",
  properties: {
    use: {enum: Object.values(PatientNameUse)},
    given: {
      type: "array",
      items: {type: "string"}
    },
    family: {type: "string"}
  },
  required: ["use", "family"]
} as const satisfies JSONSchema

const PatientAddressSchema = {
  type: "object",
  properties: {
    use: {enum: Object.values(PatientAddressUse)},
    line: {
      type: "array",
      items: {type: "string"}
    },
    postalCode: {type: "string"}
  },
  required: ["use", "line"]
} as const satisfies JSONSchema

const UnrestrictedPatientResourceSchema = {
  type: "object",
  properties: {
    meta: {
      type: "object",
      properties: {
        security:{
          type: "array",
          items: {
            type: "object",
            properties: {
              code: {
                const: PatientMetaCode.UNRESTRICTED
              }
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
      items: PatientNameSchema,
      // PDS response will always contain a usual name
      contains: {
        type: "object",
        properties: {
          use: {const: PatientNameUse.USUAL}
        }
      },
      minItems: 1
    },
    gender: {enum: Object.values(PatientGender)},
    birthDate: {type: "string"},
    address: {
      type: "array",
      items: PatientAddressSchema,
      // PDS response will always contain a home address
      contains: {
        type: "object",
        properties: {
          use: {const: PatientAddressUse.HOME}
        },
        required: ["use"]
      },
      minItems: 1
    }
  },
  required: ["meta", "id", "name", "gender", "birthDate", "address"]
} as const satisfies JSONSchema

type UnrestrictedPatientResource = FromSchema<typeof UnrestrictedPatientResourceSchema>

const RestrictedPatientResourceSchema = {
  type: "object",
  properties: {
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
                enum: Object.values(PatientMetaCode).filter((code) => code !== PatientMetaCode.UNRESTRICTED)
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
  required: ["meta"]
} as const satisfies JSONSchema

const SuccessfulResponseSchema = {
  type: "object",
  properties: {
    resourceType: {const: ResponseType.BUNDLE},
    total: {type: "integer", minimum: 1},
    entry: {
      type: "array",
      items: {
        type: "object",
        properties: {
          resource: {
            anyOf: [
              RestrictedPatientResourceSchema,
              UnrestrictedPatientResourceSchema
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
type SuccessfulResponse = FromSchema<typeof SuccessfulResponseSchema>

const EmptySearchResponseSchema = {
  type: "object",
  properties: {
    resourceType: {const: ResponseType.BUNDLE},
    total: {const: 0}
  },
  required: ["resourceType", "total"]
} as const satisfies JSONSchema

const TooManyMatchesResponseSchema = {
  type: "object",
  properties: {
    resourceType: {const: ResponseType.OPERATION_OUTCOME},
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

const PDSResponseSchema = {
  type: "object",
  oneOf: [
    TooManyMatchesResponseSchema,
    EmptySearchResponseSchema,
    SuccessfulResponseSchema
  ]
} as const satisfies JSONSchema

type PDSResponseType = FromSchema<typeof PDSResponseSchema>

class ResponseValidator {
  private readonly ajv: Ajv
  private readonly validator: ValidateFunction<PDSResponseType>
  validate: (data: unknown) => data is PDSResponseType
  validationErrors: () => Array<ErrorObject>

  constructor() {
    this.ajv = new Ajv()
    this.validator = this.ajv.compile<PDSResponseType>(PDSResponseSchema)

    this.validate = (data: unknown) => this.validator(data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.validationErrors = () => (this.validator as any).errors ?? []
  }
}

export {
  ResponseValidator,
  ResponseType,
  SuccessfulResponse,
  PatientMetaCode,
  UnrestrictedPatientResource,
  PatientNameUse,
  PatientAddressUse
}
