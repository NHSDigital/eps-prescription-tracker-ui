import "@testing-library/jest-dom"
import
{render,
  screen,
  fireEvent,
  waitFor,
  act}
  from "@testing-library/react"
import {BrowserRouter, MemoryRouter} from "react-router-dom"
import React from "react"
import App from "@/App"
import {FRONTEND_PATHS} from "@/constants/environment"

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
jest.mock("@/pages/TooManySearchResultsPage", () => () => <div>Too Many Search Results</div>)
jest.mock("@/pages/NoPrescriptionsFoundPage", () => () => <div>No Prescriptions Found</div>)
jest.mock("@/pages/NoPatientsFoundPage", () => () => <div>No Patients Found</div>)

// Mock HEADER_STRINGS to avoid dependency on constants
jest.mock("@/constants/ui-strings/HeaderStrings", () => ({
  HEADER_STRINGS: {
    SKIP_TO_MAIN_CONTENT: "Skip to main content"
  }
}))

// Test helper function to render App with specific route
const renderAppAtRoute = (route: string) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  )
}

describe("App", () => {
  // Setup function to clear focus before each test
  beforeEach(() => {
    // Reset focus to body
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur?.()
    }
    // Clear any existing event listeners
    jest.clearAllMocks()
  })

  describe("Skip link rendering", () => {
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

    it("renders skip link with patient details banner target for prescription list current page", () => {
      renderAppAtRoute(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)

      const skipLink = screen.getByTestId("eps_header_skipLink")
      expect(skipLink).toHaveAttribute("href", "#patient-details-banner")
    })

    it("renders skip link with patient details banner target for prescription list future page", () => {
      renderAppAtRoute(FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE)

      const skipLink = screen.getByTestId("eps_header_skipLink")
      expect(skipLink).toHaveAttribute("href", "#patient-details-banner")
    })

    it("renders skip link with patient details banner target for prescription list past page", () => {
      renderAppAtRoute(FRONTEND_PATHS.PRESCRIPTION_LIST_PAST)

      const skipLink = screen.getByTestId("eps_header_skipLink")
      expect(skipLink).toHaveAttribute("href", "#patient-details-banner")
    })

    it("renders skip link with patient details banner target for prescription details page", () => {
      renderAppAtRoute(`${FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE}/123`)

      const skipLink = screen.getByTestId("eps_header_skipLink")
      expect(skipLink).toHaveAttribute("href", "#patient-details-banner")
    })

    it("renders skip link with main content target for non-prescription pages", () => {
      renderAppAtRoute(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)

      const skipLink = screen.getByTestId("eps_header_skipLink")
      expect(skipLink).toHaveAttribute("href", "#main-content")
    })
  })

  describe("Skip link keyboard navigation", () => {
    it("focuses skip link on first Tab press when page loads without user interaction", async () => {
      renderAppAtRoute("/")

      const skipLink = screen.getByTestId("eps_header_skipLink")

      // Simulate Tab key press
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})

      await waitFor(() => {
        expect(skipLink).toHaveFocus()
      })
    })

    it("does not focus skip link on Tab press when user has already clicked on page", async () => {
      renderAppAtRoute("/")

      const skipLink = screen.getByTestId("eps_header_skipLink")

      // Simulate user clicking on the page
      fireEvent.click(document.body)

      // Simulate Tab key press
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})

      await waitFor(() => {
        expect(skipLink).not.toHaveFocus()
      })
    })

    it("does not focus skip link on Tab press when user has already focused an element", async () => {
      renderAppAtRoute("/")

      const skipLink = screen.getByTestId("eps_header_skipLink")

      // Create a focusable element and simulate user focusing it
      const button = document.createElement("button")
      button.setAttribute("data-testid", "test-button")
      document.body.appendChild(button)
      fireEvent.focusIn(button)

      // Simulate Tab key press
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})

      await waitFor(() => {
        expect(skipLink).not.toHaveFocus()
      })

      // Cleanup
      document.body.removeChild(button)
    })

    it("does not focus skip link on Shift+Tab press", async () => {
      renderAppAtRoute("/")

      const skipLink = screen.getByTestId("eps_header_skipLink")

      // Simulate Shift+Tab key press
      fireEvent.keyDown(document, {key: "Tab", code: "Tab", shiftKey: true})

      await waitFor(() => {
        expect(skipLink).not.toHaveFocus()
      })
    })

    it("does not trigger skip link behavior on non-Tab key press", async () => {
      renderAppAtRoute("/")

      const skipLink = screen.getByTestId("eps_header_skipLink")

      // Simulate Enter key press
      fireEvent.keyDown(document, {key: "Enter", code: "Enter"})

      await waitFor(() => {
        expect(skipLink).not.toHaveFocus()
      })
    })

    it("only triggers skip link behavior once per page load", async () => {
      renderAppAtRoute("/")

      const skipLink = screen.getByTestId("eps_header_skipLink")

      // First Tab press should focus skip link
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
      await waitFor(() => {
        expect(skipLink).toHaveFocus()
      })

      // Blur the skip link
      skipLink.blur()

      // Second Tab press should not focus skip link again
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})

      // Give some time to ensure focus doesn't change
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(skipLink).not.toHaveFocus()
    })

    it("resets skip link behavior when navigating to a new page", async () => {
      const {rerender} = render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      )

      let skipLink = screen.getByTestId("eps_header_skipLink")

      // First Tab press should focus skip link
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
      await waitFor(() => {
        expect(skipLink).toHaveFocus()
      })

      // Navigate to a new page by re-rendering with a different route
      await act(async () => {
        rerender(
          <MemoryRouter initialEntries={[FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID]}>
            <App />
          </MemoryRouter>
        )
      })

      // Get the new skip link element after rerender
      skipLink = screen.getByTestId("eps_header_skipLink")

      // Tab press should focus skip link again after navigation
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
      await waitFor(() => {
        expect(skipLink).toHaveFocus()
      })
    })

    it("handles case when skip link element is not found", async () => {
      renderAppAtRoute("/")

      // Mock querySelector to return null
      const originalQuerySelector = document.querySelector
      document.querySelector = jest.fn().mockReturnValue(null)

      // This should not throw an error
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})

      // Restore original querySelector
      document.querySelector = originalQuerySelector
    })

    it("detects user interaction when an element already has focus on page load", async () => {
      // Create a focusable element and focus it before rendering
      const input = document.createElement("input")
      input.setAttribute("data-testid", "pre-focused-input")
      document.body.appendChild(input)
      input.focus()

      renderAppAtRoute("/")

      const skipLink = screen.getByTestId("eps_header_skipLink")

      // Tab press should not focus skip link since user has already interacted
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})

      await waitFor(() => {
        expect(skipLink).not.toHaveFocus()
      })

      // Cleanup
      document.body.removeChild(input)
    })
  })

  describe("Route handling", () => {
    it("renders the app with routing components", () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )

      // Verify the basic app structure is rendered
      expect(screen.getByTestId("eps_header_skipLink")).toBeInTheDocument()
      expect(screen.getByTestId("layout")).toBeInTheDocument()
    })

    it("handles different route paths without errors", () => {
      expect(() => {
        render(
          <MemoryRouter initialEntries={["/login"]}>
            <App />
          </MemoryRouter>
        )
      }).not.toThrow()

      expect(screen.getByTestId("eps_header_skipLink")).toBeInTheDocument()
    })
  })
})

// Removed duplicate describe block
