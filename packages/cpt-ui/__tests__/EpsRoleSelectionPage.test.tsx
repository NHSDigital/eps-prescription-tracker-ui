import "@testing-library/jest-dom"
import {render, screen, waitFor} from "@testing-library/react"
import {useRouter} from "next/navigation"
import React from "react"
import EpsRoleSelectionPage from "@/components/EpsRoleSelectionPage"
import {AuthContext} from "@/context/AuthProvider"

jest.mock("@/constants/ui-strings/CardStrings", () => {
  return {
    EPS_CARD_STRINGS: {
      noOrgName: "NO ORG NAME",
      noODSCode: "No ODS code",
      noRoleName: "No role name",
      noAddress: "Address not found"
    }
  }
})

jest.mock("next/navigation", () => ({
  useRouter: jest.fn()
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

jest.mock("@/context/AccessProvider", () => {
  const React = require("react")

  let mockContextValue = {
    noAccess: false,
    singleAccess: false,
    selectedRole: null,
    setNoAccess: jest.fn(),
    setSingleAccess: jest.fn(),
    setSelectedRole: jest.fn()
  }

  const MockAccessContext = React.createContext(mockContextValue)
  const useAccess = () => React.useContext(MockAccessContext)

  return {
    __esModule: true,
    AccessContext: MockAccessContext,
    useAccess,
    __setMockContextValue: (newValue) => {
      mockContextValue = {...mockContextValue, ...newValue}
    }
  }
})

const {__setMockContextValue} = require("@/context/AccessProvider")

const defaultAuthContext = {
  error: null,
  user: null,
  isSignedIn: true,
  idToken: {toString: jest.fn().mockReturnValue("mock-id-token")},
  accessToken: null,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn()
}

const renderWithAuth = (authOverrides = {}) => {
  const authValue = {...defaultAuthContext, ...authOverrides}

  return render(
    <AuthContext.Provider value={authValue}>
      <EpsRoleSelectionPage contentText={{
        title: "Select your role",
        caption: "Please select your role.",
        titleNoAccess: "No access to the service",
        captionNoAccess: "No access available.",
        insetText: {visuallyHidden: "Information:", message: "You are logged in."},
        confirmButton: {link: "/confirm", text: "Confirm"},
        alternativeMessage: "Choose a new role below.",
        organisation: "Organisation",
        role: "Role",
        roles_without_access_table_title: "Roles without access",
        noOrgName: "NO ORG NAME",
        rolesWithoutAccessHeader: "Roles without access",
        noODSCode: "No ODS code",
        noRoleName: "No role name",
        noAddress: "No address",
        errorDuringRoleSelection: "Error fetching roles"
      }} />
    </AuthContext.Provider>
  )
}

describe("EpsRoleSelectionPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __setMockContextValue({
      noAccess: false
    })
  })

  it("renders loading state when waiting for API response", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    renderWithAuth()
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("renders error summary when API fails", async () => {
    mockFetch.mockResolvedValue({status: 500})
    renderWithAuth()

    await waitFor(() => {
      expect(screen.getByText("Error fetching roles")).toBeInTheDocument()
    })
  })

  it("redirects when a single role is available", async () => {
    const mockPush = jest.fn()
    useRouter.mockReturnValue({push: mockPush})

    const mockUserInfo = {
      roles_with_access: [{
        role_name: "Pharmacist",
        org_name: "Test Pharmacy",
        org_code: "ORG123",
        site_address: "123 Test St"
      }],
      roles_without_access: []
    }

    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({userInfo: mockUserInfo})
    })

    renderWithAuth()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/searchforaprescription")
    })
  })
})
