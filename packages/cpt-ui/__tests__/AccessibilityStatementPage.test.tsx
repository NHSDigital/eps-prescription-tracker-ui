import "@testing-library/jest-dom"
import React, {useState} from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import AccessibilityStatementPage from "@/pages/AccessibilityStatementPage"
import {AccessibilityStatementStrings} from "@/constants/ui-strings/AccessibilityStatementStrings"
import {mockAuthState} from "./mocks/AuthStateMock"

jest.mock("@/helpers/awsRum")
jest.mock("@/context/configureAmplify")

jest.mock("@/constants/environment", () => ({
  AUTH_CONFIG: {
    USER_POOL_ID: "test-pool-id",
    USER_POOL_CLIENT_ID: "test-client-id",
    HOSTED_LOGIN_DOMAIN: "test.domain",
    REDIRECT_SIGN_IN: "http://localhost:3000",
    REDIRECT_SIGN_OUT: "http://localhost:3000/logout"
  },
  APP_CONFIG: {
    REACT_LOG_LEVEL: "debug"
  },
  API_ENDPOINTS: {
    CIS2_SIGNOUT_ENDPOINT: "/api/cis2-signout"
  },
  FRONTEND_PATHS: {
    LOGIN: "/login",
    SEARCH_BY_PRESCRIPTION_ID: "/search-by-prescription-id"
  }
}))

const signedOutAuthState: AuthContextType = {
  ...mockAuthState,
  isSignedIn: false
}

const signedInAuthState: AuthContextType = {
  ...mockAuthState,
  isSignedIn: true
}

const MockAuthProvider = ({
  children,
  authState
}: {
  children: React.ReactNode;
  authState: AuthContextType;
}) => {
  const [state] = useState<AuthContextType>(authState)
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

const renderPage = (authState: AuthContextType = signedOutAuthState) => {
  return render(
    <MockAuthProvider authState={authState}>
      <MemoryRouter>
        <AccessibilityStatementPage />
      </MemoryRouter>
    </MockAuthProvider>
  )
}

describe("AccessibilityStatementPage", () => {
  describe("page structure", () => {
    it("renders the main container", () => {
      renderPage()
      expect(screen.getByRole("main")).toBeInTheDocument()
    })

    it("renders the page heading", () => {
      renderPage()
      expect(
        screen.getByRole("heading", {level: 1, name: AccessibilityStatementStrings.HEADER})
      ).toBeInTheDocument()
    })

    it("renders the breadcrumb Home link", () => {
      renderPage()
      expect(screen.getByRole("link", {name: AccessibilityStatementStrings.HOME})).toBeInTheDocument()
    })
  })

  describe("section headings", () => {
    beforeEach(() => {
      renderPage()
    })

    it("renders the known issues heading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.KNOWN_ISSUES.HEADER})
      ).toBeInTheDocument()
    })

    it("renders the feedback and contact information heading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.FEEDBACK_CONTACT_INFORMATION.HEADER})
      ).toBeInTheDocument()
    })

    it("renders the enforcement procedure heading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.ENFORCEMENT_PROCEDURE.HEADER})
      ).toBeInTheDocument()
    })

    it("renders the technical information heading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.TECHNICAL_INFORMATION.HEADER})
      ).toBeInTheDocument()
    })

    it("renders the compliance status heading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.COMPLIANCE_STATUS.HEADER})
      ).toBeInTheDocument()
    })

    it("renders the non-accessible content heading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.NONACCESSIBLE_CONTENT.HEADER})
      ).toBeInTheDocument()
    })

    it("renders the non-compliance subheading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.NONACCESSIBLE_CONTENT.SUBHEADER})
      ).toBeInTheDocument()
    })

    it("renders the improving accessibility heading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.HEADER})
      ).toBeInTheDocument()
    })

    it("renders the preparation subheading", () => {
      expect(
        screen.getByRole("heading", {name: AccessibilityStatementStrings.IMPROVING_ACCESSIBILITY.SUBHEADER})
      ).toBeInTheDocument()
    })
  })

  describe("links rendered via EpsRichText", () => {
    beforeEach(() => {
      renderPage()
    })

    it("renders the Prescription Tracker link in the opening paragraph", () => {
      const link = screen.getByRole("link", {name: "Prescription Tracker"})
      expect(link).toHaveAttribute("href", "/site")
      expect(link).not.toHaveAttribute("target")
    })

    it("renders the AbilityNet external link", () => {
      const link = screen.getByRole("link", {name: "AbilityNet (opens in new tab)"})
      expect(link).toHaveAttribute("href", "https://www.abilitynet.org.uk/")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noreferrer")
    })

    it("renders the email link in the feedback section", () => {
      const links = screen.getAllByRole("link", {name: "england.prescriptiontrackerpilot@nhs.net"})
      expect(links).toHaveLength(2)
      links.forEach((link) => {
        expect(link).toHaveAttribute("href", "mailto:england.prescriptiontrackerpilot@nhs.net")
      })
    })

    it("renders the Equality Advisory Service external link", () => {
      const link = screen.getByRole("link", {
        name: "Equality Advisory and Support Service (opens in new tab)"
      })
      expect(link).toHaveAttribute("href", "https://www.equalityadvisoryservice.com/")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noreferrer")
    })
  })

  describe("list content", () => {
    it("renders the opening section accessibility features list", () => {
      renderPage()
      AccessibilityStatementStrings.OPENING_SECTION.LIST_ITEMS.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument()
      })
    })

    it("renders the known issues list", () => {
      renderPage()
      AccessibilityStatementStrings.KNOWN_ISSUES.LIST_ITEMS.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument()
      })
    })

    it("renders the non-compliance sub-list", () => {
      renderPage()
      AccessibilityStatementStrings.NONACCESSIBLE_CONTENT.SUB_LIST_ITEMS.forEach((item) => {
        expect(screen.getByText(item.trim())).toBeInTheDocument()
      })
    })
  })

  describe("breadcrumb home link destination", () => {
    it("links to the login page when signed out", () => {
      renderPage(signedOutAuthState)
      const homeLink = screen.getByRole("link", {name: AccessibilityStatementStrings.HOME})
      expect(homeLink).toHaveAttribute("href", "/login")
    })

    it("links to the search page when signed in", () => {
      renderPage(signedInAuthState)
      const homeLink = screen.getByRole("link", {name: AccessibilityStatementStrings.HOME})
      expect(homeLink).toHaveAttribute("href", "/search-by-prescription-id")
    })
  })
})
