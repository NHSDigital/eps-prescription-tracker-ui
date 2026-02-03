import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import {BrowserRouter} from "react-router-dom"
import React from "react"
import App from "@/App"

// Mock all the context providers
jest.mock("@/context/AuthProvider", () => ({
  AuthProvider: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}))

jest.mock("@/context/AccessProvider", () => ({
  AccessProvider: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}))

jest.mock("@/context/SearchProvider", () => ({
  SearchProvider: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}))

jest.mock("@/context/NavigationProvider", () => ({
  NavigationProvider: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}))

jest.mock("@/context/PatientDetailsProvider", () => ({
  PatientDetailsProvider: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}))

jest.mock("@/context/PrescriptionInformationProvider", () => ({
  PrescriptionInformationProvider: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}))

// Mock Layout component
jest.mock("@/Layout", () => {
  return function MockLayout({children}: {children: React.ReactNode}) {
    return <div data-testid="layout">{children}</div>
  }
})

// Mock all the page components
jest.mock("@/pages/LoginPage", () => () => <div>Login Page</div>)
jest.mock("@/pages/LogoutPage", () => () => <div>Logout Page</div>)
jest.mock("@/pages/SelectYourRolePage", () => () => <div>Select Your Role</div>)
jest.mock("@/pages/ChangeRolePage", () => () => <div>Change Role</div>)
jest.mock(
  "@/pages/SearchPrescriptionPage",
  () => () => <div>Search Prescription</div>
)
jest.mock("@/pages/YourSelectedRolePage", () => () => <div>Your Selected Role</div>)
jest.mock("@/pages/NotFoundPage", () => () => <div>Not Found</div>)
jest.mock("@/pages/PrescriptionListPage", () => () => <div>Prescription List</div>)
jest.mock(
  "@/pages/PrescriptionDetailsPage",
  () => () => <div>Prescription Details</div>
)
jest.mock("@/pages/CookiePolicyPage", () => () => <div>Cookie Policy</div>)
jest.mock("@/pages/CookieSettingsPage", () => () => <div>Cookie Settings</div>)
jest.mock(
  "@/pages/BasicDetailsSearchResultsPage",
  () => () => <div>Search Results</div>
)
jest.mock("@/pages/PrivacyNoticePage", () => () => <div>Privacy Notice</div>)
jest.mock("@/pages/SessionSelection", () => () => <div>Session Selection</div>)
jest.mock("@/pages/SessionLoggedOut", () => () => <div>Session Logged Out</div>)

// Mock EPSCookieBanner
jest.mock("@/components/EPSCookieBanner", () => () => <div>Cookie Banner</div>)

describe("App", () => {
  it("renders the skip link for regular pages", () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    const skipLink = screen.getByTestId("eps_header_skipLink")
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute("href", "#main-content")
    expect(skipLink).toHaveTextContent("Skip to main content")
    expect(skipLink).toHaveClass("nhsuk-skip-link")
  })
})
