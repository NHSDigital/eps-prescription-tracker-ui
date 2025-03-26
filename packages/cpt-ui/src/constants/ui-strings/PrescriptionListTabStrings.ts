export interface PrescriptionsListStrings {
    testid: string
    heading: string
}

export const PRESCRIPTION_LIST_TABS = [
  {title: "Current Prescriptions", targetId: "current"},
  {title: "Future dated Prescriptions", targetId: "future"},
  {title: "Claimed and expired Prescriptions", targetId: "past"}
]

export const CURRENT_PRESCRIPTIONS: PrescriptionsListStrings = {
  testid: "current",
  heading: "Current prescriptions table"
}

export const PAST_PRESCRIPTIONS: PrescriptionsListStrings = {
  testid: "past",
  heading: "Past prescriptions table"
}

export const FUTURE_PRESCRIPTIONS: PrescriptionsListStrings = {
  testid: "future",
  heading: "future prescriptions table"
}
