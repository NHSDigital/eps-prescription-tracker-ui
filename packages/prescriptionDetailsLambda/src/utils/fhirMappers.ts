import {PrescriptionIntent} from "./types"

/**
 * Maps the FHIR intent to a user-friendly prescription treatment type display value.
 * Since FHIR uses standardized intent values, we must convert them into human-readable descriptions.
 */
export const mapIntentToPrescriptionTreatmentType = (intent: string): string => {
  const intentToTreatmentTypeMap: Record<PrescriptionIntent, string> = {
    "order": "Acute", // Standard prescription → Acute
    "instance-order": "Repeat Prescribing", // Sub-order → Repeat Prescribing
    "reflex-order": "Repeat Dispensing" // Self-repeating order → Repeat Dispensing
  }

  return intentToTreatmentTypeMap[intent as PrescriptionIntent] || "Unknown" // Default to "Unknown" if not mapped
}
