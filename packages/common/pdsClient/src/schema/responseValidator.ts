import Ajv, {AnySchema, ErrorObject, ValidateFunction} from "ajv"

export class ResponseValidator<ResponseType> {
  private readonly ajv: Ajv
  private readonly validator: ValidateFunction<ResponseType>
  validate: (data: unknown) => data is ResponseType
  validationErrors: () => Array<ErrorObject>

  public constructor(schema: AnySchema) {
    this.ajv = new Ajv()
    this.validator = this.ajv.compile<ResponseType>(schema)

    this.validate = (data: unknown) => this.validator(data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.validationErrors = () => (this.validator as any).errors ?? []
  }
}
