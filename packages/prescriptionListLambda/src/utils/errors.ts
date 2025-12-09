export class PrescriptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PrescriptionError"
  }
}
export class PDSError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "RESTRICTED" | "PARSE_ERROR" | "PDS_ERROR" | "INCOMPLETE_DATA" = "NOT_FOUND",
    public readonly requiresFallback: boolean = true
  ) {
    super(message)
    this.name = "PDSError"
  }
}
