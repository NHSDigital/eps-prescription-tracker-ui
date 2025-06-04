import {SearchParams} from "./types"

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

/**
 * Validates search parameters according to business rules
 * @param params Search parameters to validate
 * @throws ValidationError if validation fails
 */
export function validateSearchParams(params: SearchParams): void {
  // Check that at least one parameter is provided
  if (!params.prescriptionId && !params.nhsNumber) {
    throw new ValidationError("Either prescriptionId or nhsNumber must be provided")
  }

  // Check that only one parameter is provided
  if (params.prescriptionId && params.nhsNumber) {
    throw new ValidationError("Cannot search by both prescriptionId and nhsNumber")
  }
}
