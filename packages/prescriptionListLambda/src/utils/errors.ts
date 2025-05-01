export class PrescriptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PrescriptionError"
  }
}
