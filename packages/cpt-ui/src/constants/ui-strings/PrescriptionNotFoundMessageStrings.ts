export type AllowedSearchType =
  | "PrescriptionIdSearch"
  | "NhsNumberSearch"
  | "BasicDetailsSearch"
  | "PrescriptionListPage"

export const SEARCH_STRINGS = {
  PrescriptionIdSearch: {
    body: [
      "We could not find any prescriptions using the prescription ID number you searched for.",
      "Check that the details are correct, or {0} or {1}.",
      "If the patient should have a prescription, contact the prescriber."
    ],
    alternatives: [
      {
        to: "SEARCH_BY_NHS_NUMBER",
        label: "search using an NHS number"
      },
      {
        to: "SEARCH_BY_BASIC_DETAILS",
        label: "search using a patient's basic details"
      }
    ]
  },
  NhsNumberSearch: {
    body: [
      "We could not find any prescriptions using the NHS number you searched for.",
      "Check that the details are correct, or {0} or {1}.",
      "If the patient should have a prescription, contact the prescriber."
    ],
    alternatives: [
      {
        to: "SEARCH_BY_PRESCRIPTION_ID",
        label: "search using a prescription ID"
      },
      {
        to: "SEARCH_BY_BASIC_DETAILS",
        label: "search using a patient's basic details"
      }
    ]
  },
  BasicDetailsSearch: {
    body: [
      "We could not find any prescriptions using the patient details you searched for.",
      "Check that the details are correct, or {0} or {1}.",
      "If the patient should have a prescription, contact the prescriber."
    ],
    alternatives: [
      {
        to: "SEARCH_BY_PRESCRIPTION_ID",
        label: "search using a prescription ID"
      },
      {
        to: "SEARCH_BY_NHS_NUMBER",
        label: "search using an NHS number"
      }
    ]
  },
  PrescriptionListPage: {
    body: ["", "", ""],
    alternatives: []
  }
} as const

export const STRINGS = {
  heading: "No prescriptions found",
  goBackLink: "Back"
} as const

export const SEARCH_TYPES = {
  PRESCRIPTION_ID: "PrescriptionIdSearch",
  NHS_NUMBER: "NhsNumberSearch",
  BASIC_DETAILS: "BasicDetailsSearch",
  PRESCRIPTION_LIST: "PrescriptionListPage"
} as const
