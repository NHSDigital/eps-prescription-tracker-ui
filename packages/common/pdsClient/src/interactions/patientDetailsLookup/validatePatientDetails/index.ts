import {PatientDetails} from "@cpt-ui-common/common-types"

enum ValidatePatientDetailsOutcomeType {
    VALID = "valid",
    MISSING_FIELDS = "missing_fields",
    NOT_NULL_WHEN_NOT_PRESENT = "not_null_when_not_present"
}

type ValidatePatientDetailsOutcomeValid = {
  type: ValidatePatientDetailsOutcomeType.VALID
}
type ValidatePatientDetailsOutcomeMissingFields = {
  type: ValidatePatientDetailsOutcomeType.MISSING_FIELDS
  missingFields: Array<string>
}
type ValidatePatientDetailsOutcomeNotNullWhenNotPresent = {
  type: ValidatePatientDetailsOutcomeType.NOT_NULL_WHEN_NOT_PRESENT
  field: string
}

type ValidatePatientDetailsInvalidOutcomes =
  | ValidatePatientDetailsOutcomeMissingFields
  | ValidatePatientDetailsOutcomeNotNullWhenNotPresent

type ValidatePatientDetailsOutcome =
    | ValidatePatientDetailsOutcomeValid
    | ValidatePatientDetailsOutcomeMissingFields
    | ValidatePatientDetailsOutcomeNotNullWhenNotPresent

const validate = (details: PatientDetails): ValidatePatientDetailsOutcome => {
  const requiredFields = [
    {field: "nhsNumber", value: details.nhsNumber},
    {field: "given", value: details.given},
    {field: "family", value: details.family}
  ]

  const missingFields = requiredFields
    .filter(({value}) => !value)
    .map(({field}) => field)

  if (missingFields.length > 0) {
    return {
      type: ValidatePatientDetailsOutcomeType.MISSING_FIELDS,
      missingFields
    }
  }

  // Explicitly check that optional fields are null when not present
  if (!details.gender && details.gender !== null) {
    return {
      type: ValidatePatientDetailsOutcomeType.NOT_NULL_WHEN_NOT_PRESENT,
      field: "gender"
    }
  }
  if (!details.dateOfBirth && details.dateOfBirth !== null) {
    return {
      type: ValidatePatientDetailsOutcomeType.NOT_NULL_WHEN_NOT_PRESENT,
      field: "dateOfBirth"
    }
  }
  if (!details.address && details.address !== null) {
    return {
      type: ValidatePatientDetailsOutcomeType.NOT_NULL_WHEN_NOT_PRESENT,
      field: "address"
    }
  }

  return {
    type: ValidatePatientDetailsOutcomeType.VALID
  }
}

export {
  ValidatePatientDetailsOutcome as Outcome,
  ValidatePatientDetailsOutcomeType as OutcomeType,
  ValidatePatientDetailsInvalidOutcomes as InvalidOutcomes,
  validate
}
