import React from "react"
import {render, screen, fireEvent} from "@testing-library/react"
import CookiePolicyPage from "@/pages/CookiePolicyPage"
import {useAuth} from "@/context/AuthProvider"
import {cptAwsRum} from "@/helpers/awsRum"
import {MemoryRouter} from "react-router-dom"

// Mocks
jest.mock("@/context/AuthProvider", () => ({
  useAuth: jest.fn()
}))

jest.mock("@/helpers/awsRum", () => ({
  cptAwsRum: {
    enable: jest.fn(),
    disable: jest.fn(),
    recordPageView: jest.fn()
  }
}))

jest.mock("@/constants/environment", () => ({
  FRONTEND_PATHS: {
    SEARCH_BY_PRESCRIPTION_ID: "/search",
    LOGIN: "/login"
  }
}))

jest.mock("@/constants/ui-strings/CookieStrings", () => ({
  CookieStrings: {
    banner : {
      cookie_title: "Cookies on the Prescription Tracker",
      cookie_text_p1: "We've put some small files called cookies on your device to make our site work.",
      cookie_text_p2: "We’d also like to use analytics cookies. "
    + "These send anonymous information about how our site is used to a service "
    + "called Amazon CloudWatch RUM. We use this information to improve our site.",
      cookie_text_p3:"Let us know if this is OK. We'll use a cookie to save your choice. You can ",
      cookie_text_p4: "before you choose.",
      cookies_info_link_text: "read more about our cookies "
    },
    home: "Home",
    breadcrumbBack: {visuallyHidden: "Back to"},
    cptCookies: "Cookies Policy",
    intro: {
      paragraph1: "See our privacy policy for more.",
      privacyPolicyText: "privacy policy"
    },
    whatAreCookies: {
      heading: "What are cookies?",
      paragraph1: "Paragraph 1",
      paragraph2: "Paragraph 2",
      paragraph3: "Paragraph 3"
    },
    howWeUseCookies: {
      heading: "How we use cookies",
      paragraph1: "We use them...",
      paragraph2: "Details here..."
    },
    essentialCookies: {
      heading: "Essential cookies",
      tableTitle: "Essential Cookies Table"
    },
    analyticsCookies: {
      heading: "Analytics cookies",
      tableTitle: "Analytics cookies",
      policyLinkText: "Amazon CloudWatch RUM",
      paragraph1: "See Amazon CloudWatch RUM privacy policy for more."
    },
    cookieSettings: {
      heading: "Cookie settings",
      acceptLabel: "Accept analytics cookies",
      rejectLabel: "Reject analytics cookies",
      saveButton: "Save cookie preferences"
    },
    changeSettings: {
      heading: "Change your settings",
      paragraph1: "You can change settings anytime.",
      paragraph2: "Paragraph 2",
      paragraph3: "Paragraph 3"
    },
    policyChanges: {
      heading: "Policy changes",
      paragraph1: "We update this policy regularly."
    },
    pageLastReviewed: "Last reviewed: Jan 2025",
    pageNextReviewed: "Next review: Jan 2026",
    essential: [{
      name: "nhsuk-cookie-consent",
      purpose: "Saves your cookie consent settings",
      expiry: "When you close the browser"
    }],
    analytics: [{
      name: "cwr_s",
      purpose:
    "Used by Amazon CloudWatch RUM. Tells us how you use our website by ading the previous page you visited",
      expiry: "When you close the browser"
    }, {
      name: "cwr_u",
      purpose: "Used by Amazon CloudWatch RUM. Tells us if you've used our website before",
      expiry: "When you close the browser"
    }],
    detailsSummaryText: (type: string) => `See the ${type.toLowerCase()} we use`
  }
}))

const renderWithRouter = () =>
  render(
    <MemoryRouter>
      <CookiePolicyPage />
    </MemoryRouter>
  )

describe("CookiePolicyPage", () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({isSignedIn: false})
    window.NHSCookieConsent = {
      getConsented: () => true,
      getStatistics: () => false,
      setStatistics: jest.fn(),
      setConsented: jest.fn(),
      VERSION: "version",
      getPreferences: jest.fn(),
      getMarketing: jest.fn(),
      setMarketing: jest.fn(),
      setPreferences: jest.fn()
    }
  })

  it("renders cookie policy heading and radio buttons", () => {
    renderWithRouter()

    expect(screen.getByRole("heading", {name: /cookies policy/i})).toBeInTheDocument()
    expect(screen.getByLabelText(/accept analytics cookies/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reject analytics cookies/i)).toBeInTheDocument()
  })

  it("selects reject by default if NHSCookieConsent has no statistics", () => {
    renderWithRouter()
    const rejectInput = screen.getByTestId("reject-analytics-cookies") as HTMLInputElement
    expect(rejectInput.checked).toBe(true)
  })

  it("allows selecting accept analytics cookies", () => {
    renderWithRouter()
    const acceptInput = screen.getByTestId("accept-analytics-cookies") as HTMLInputElement
    fireEvent.click(acceptInput)
    expect(acceptInput.checked).toBe(true)
  })

  it("saves accepted cookie choice and enables rum", () => {
    const navigateMock = jest.fn()
    jest.mock("react-router-dom", () => ({
      ...jest.requireActual("react-router-dom"),
      useNavigate: () => navigateMock
    }))

    renderWithRouter()

    const acceptInput = screen.getByTestId("accept-analytics-cookies")
    fireEvent.click(acceptInput)

    fireEvent.click(screen.getByTestId("save-cookie-preferences"))

    expect(cptAwsRum.enable).toHaveBeenCalled()
    expect(window.NHSCookieConsent?.setStatistics).toHaveBeenCalledWith(true)
    expect(window.NHSCookieConsent?.setConsented).toHaveBeenCalledWith(true)
  })

  it("saves rejected cookie choice and disables rum", () => {
    renderWithRouter()

    const rejectInput = screen.getByTestId("reject-analytics-cookies")
    fireEvent.click(rejectInput)

    fireEvent.click(screen.getByTestId("save-cookie-preferences"))

    expect(cptAwsRum.disable).toHaveBeenCalled()
    expect(window.NHSCookieConsent?.setStatistics).toHaveBeenCalledWith(false)
    expect(window.NHSCookieConsent?.setConsented).toHaveBeenCalledWith(true)
  })
})
