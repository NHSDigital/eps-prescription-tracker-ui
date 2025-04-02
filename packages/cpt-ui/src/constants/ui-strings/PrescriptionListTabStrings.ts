import {FRONTEND_PATHS} from "../environment"

// Rather than the EpsTabs one, we need to be able to update the header and link with data.
export interface FormattableTabHeader {
  title: (count: number) => string;
  // The link needs to preserve the query string that we came in with
  link: (query: string) => string;
}

export const PRESCRIPTION_LIST_TABS: Record<string, FormattableTabHeader> = {
  current: {
    title: (count: number) => `Current Prescriptions (${count})`,
    link: (query: string) => FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?" + query
  },
  future: {
    title: (count: number) => `Future dated Prescriptions (${count})`,
    link: (query: string) => FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE + "?" + query
  },
  past: {
    title: (count: number) => `Claimed and expired Prescriptions (${count})`,
    link: (query: string) => FRONTEND_PATHS.PRESCRIPTION_LIST_PAST + "?" + query
  }
}

export interface PrescriptionsListStrings {
    testid: string
    heading: string
}

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
  heading: "Future prescriptions table"
}
