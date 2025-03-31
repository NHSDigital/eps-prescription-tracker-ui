import {PatientDetails} from "@cpt-ui-common/common-types"
import {SearchParams} from "./types"
import {PDSError} from "./errors"

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

export const validatePatientDetails = (details: PatientDetails): void => {
  const requiredFields = [
    {field: "nhsNumber", value: details.nhsNumber},
    {field: "given", value: details.given},
    {field: "family", value: details.family}
  ]

  const missingFields = requiredFields
    .filter(({value}) => !value)
    .map(({field}) => field)

  if (missingFields.length > 0) {
    throw new PDSError(
      `Incomplete patient information. Missing required fields: ${missingFields.join(", ")}`,
      "INCOMPLETE_DATA"
    )
  }

  // Explicitly check that optional fields are null when not present
  if (!details.gender && details.gender !== null) {
    throw new PDSError("Gender must be explicitly null when not present")
  }
  if (!details.dateOfBirth && details.dateOfBirth !== null) {
    throw new PDSError("Date of birth must be explicitly null when not present")
  }
  if (!details.address && details.address !== null) {
    throw new PDSError("Address must be explicitly null when not present")
  }
}
