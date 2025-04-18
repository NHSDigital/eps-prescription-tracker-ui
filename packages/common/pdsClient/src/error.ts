export class PDSError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "S_FLAG" | "R_FLAG" | "INCOMPLETE_DATA" = "NOT_FOUND",
    public readonly requiresFallback: boolean = true
  ) {
    super(message)
    this.name = "PDSError"
  }
}
