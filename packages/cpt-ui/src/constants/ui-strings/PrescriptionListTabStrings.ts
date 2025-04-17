import {FRONTEND_PATHS} from "../environment"

// Rather than the EpsTabs one, we need to be able to update the header and link with data.
export interface FormattableTabHeader {
  title: (count: number) => string;
  // The link needs to preserve the query string that we came in with
  link: (query: string) => string;
}

export const PRESCRIPTION_LIST_TABS: Record<string, FormattableTabHeader> = {
  current: {
    title: (count: number) => `Current prescriptions (${count})`,
    link: (query?: string) =>
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + (query ? "?" + query : "")
  },
  future: {
    title: (count: number) => `Future dated prescriptions (${count})`,
    link: (query?: string) =>
      FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE + (query ? "?" + query : "")
  },
  past: {
    title: (count: number) => `Claimed and expired prescriptions (${count})`,
    link: (query?: string) =>
      FRONTEND_PATHS.PRESCRIPTION_LIST_PAST + (query ? "?" + query : "")
  }
}
export interface PrescriptionsListStrings {
    testid: string
    heading: string
    noPrescriptionsMessage: string
}

export const CURRENT_PRESCRIPTIONS: PrescriptionsListStrings = {
  testid: "current",
  heading: "Current prescriptions table",
  noPrescriptionsMessage: "There are no current prescriptions."
}

export const PAST_PRESCRIPTIONS: PrescriptionsListStrings = {
  testid: "past",
  heading: "Past prescriptions table",
  noPrescriptionsMessage: "No claimed or expired prescriptions found."
}

export const FUTURE_PRESCRIPTIONS: PrescriptionsListStrings = {
  testid: "future",
  heading: "Future prescriptions table",
  noPrescriptionsMessage: "No future-dated prescriptions found."
}
