import React, {useState} from "react"
import {MemoryRouter, useNavigate, useSearchParams} from "react-router-dom"
import {render, screen, waitFor} from "@testing-library/react"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"
import {MockPrescriptionInformationProvider} from "../__mocks__/MockPrescriptionInformationProvider"
import {mockPrescriptionDetailsResponse} from "../__mocks__/MockPrescriptionDetailsResponse"

import {
  PrescriptionDetailsResponse,
  PrescriberOrganisationSummary,
  OrganisationSummary
} from "@cpt-ui-common/common-types"

// import {FRONTEND_PATHS} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

import {AuthContext, AuthContextType} from "@/context/AuthProvider"

import PrescriptionDetailsPage from "@/pages/PrescriptionDetailsPage"

jest.mock("@/helpers/axios", () => ({
  get: jest.fn()
}))
import http from "@/helpers/axios"

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useNavigate: jest.fn(),
    useSearchParams: jest.fn()
  }
})

const mockCognitoSignIn = jest.fn()
const mockCognitoSignOut = jest.fn()

const defaultAuthState: AuthContextType = {
  isSignedIn: false,
  isSigningIn: false,
  user: null,
  error: null,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: false,
  hasSingleRoleAccess: false,
  selectedRole: undefined,
  userDetails: undefined,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut,
  clearAuthState: jest.fn(),
  updateSelectedRole: jest.fn()
}

const signedInAuthState: AuthContextType = {
  isSignedIn: true,
  isSigningIn: false,
  user: "testUser",
  error: null,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: false,
  hasSingleRoleAccess: false,
  selectedRole: undefined,
  userDetails: undefined,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut,
  clearAuthState: jest.fn(),
  updateSelectedRole: jest.fn()
}

// Auth provider mock
const MockAuthProvider = ({
  children,
  initialState = defaultAuthState
}: {
  children: React.ReactNode
  initialState?: AuthContextType
}) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    ...initialState,
    cognitoSignIn: async (input) => {
      mockCognitoSignIn(input)
      // Simulate a sign-in update
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: true,
        user: (input?.provider as { custom: string })?.custom || "mockUser",
        error: null

      }))
    },
    cognitoSignOut: async () => {
      mockCognitoSignOut()
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: false,
        user: null,
        error: null,
        idToken: null,
        accessToken: null
      }))
    }
  })

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}

// Mock the spinner component.
jest.mock("@/components/EpsSpinner", () => () => (
  <div data-testid="eps-spinner">Spinner</div>
))

type SiteDetailsCardsProps = {
  prescriber: PrescriberOrganisationSummary
  dispenser?: OrganisationSummary
  nominatedDispenser?: OrganisationSummary
}

// simple mock for SiteDetailsCards so we can inspect the props.
jest.mock("@/components/prescriptionDetails/SiteDetailsCards", () => ({

  SiteDetailsCards: (props: SiteDetailsCardsProps) => {
    return (
      <div data-testid="site-details-cards">
        {JSON.stringify(props)}
      </div>
    )
  }
}))

const renderComponent = (
  prescriptionId: string,
  initialAuthState: AuthContextType = defaultAuthState
) => {
  const queryString = prescriptionId ? `?prescriptionId=${prescriptionId}` : ""
  const initialRoute = `/site/prescription-details${queryString}`

    ; (useSearchParams as jest.Mock).mockReturnValue([new URLSearchParams(queryString)])

  return render(
    <MockAuthProvider initialState={initialAuthState}>
      <MockPatientDetailsProvider>
        <MockPrescriptionInformationProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <PrescriptionDetailsPage />
          </MemoryRouter>
        </MockPrescriptionInformationProvider>
      </MockPatientDetailsProvider>
    </MockAuthProvider>
  )
}

describe("PrescriptionDetailsPage", () => {
  const mockNavigate = jest.fn()

  beforeEach(() => {
    mockNavigate.mockClear();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate)

    delete window.__mockedPatientDetails
    delete window.__mockedPrescriptionInformation
  })

  it("renders spinner while loading", async () => {
    // pending HTTP request.
    (http.get as jest.Mock).mockImplementation(() => new Promise(() => { }))
    renderComponent("C0C757-A83008-C2D93L")

    expect(screen.getByTestId("eps-spinner")).toBeInTheDocument()
  })

  it("does not navigate when prescriptionId is missing", async () => {
    renderComponent("", signedInAuthState)

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    // Verify that fallback UI renders
    expect(screen.getByRole("heading", {name: STRINGS.HEADER})).toBeInTheDocument()
  })

  it("handles unknown prescriptionId without navigating", async () => {
    (http.get as jest.Mock).mockRejectedValue(new Error("HTTP error"))

    renderComponent("UNKNOWN_ID", signedInAuthState)

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    // Confirm fallback or empty UI still renders
    expect(screen.getByRole("heading", {name: STRINGS.HEADER})).toBeInTheDocument()
  })

  it("renders SiteDetailsCards with correct data for a successful HTTP GET response", async () => {
    const payload: PrescriptionDetailsResponse = {
      ...mockPrescriptionDetailsResponse
    };

    (http.get as jest.Mock).mockResolvedValue({status: 200, data: payload})

    renderComponent("SUCCESS_ID", signedInAuthState)

    await waitFor(() => {
      expect(screen.getByTestId("site-details-cards")).toBeInTheDocument()
    })

    const cards = screen.getByTestId("site-details-cards")
    const props = JSON.parse(cards.textContent || "{}")

    expect(props.prescriber).toEqual(payload.prescriberOrganisation)
    if (!payload.currentDispenser || !payload.nominatedDispenser) {
      throw new Error("Expected the payload to be populated")
    }
    expect(props.dispenser).toEqual(payload.currentDispenser)
    expect(props.nominatedDispenser).toEqual(payload.nominatedDispenser)
  })

  it("displays loading message and spinner while fetching data", async () => {
    let resolveRequest: () => void = () => {}

    const payload = {
      ...mockPrescriptionDetailsResponse
    }

    // Create a promise
    const pendingPromise = new Promise((resolve) => {
      resolveRequest = () => resolve({status: 200, data: payload})
    })

    ;(http.get as jest.Mock).mockReturnValue(pendingPromise)

    renderComponent("EC5ACF-A83008-733FD3", signedInAuthState)

    // Spinner is shown while loading
    expect(screen.getByRole("heading", {name: STRINGS.LOADING_FULL_PRESCRIPTION})).toBeInTheDocument()
    expect(screen.getByTestId("eps-spinner")).toBeInTheDocument()

    // Resolve the API call
    resolveRequest()

    // Spinner disappears once data is loaded
    await waitFor(() => {
      expect(screen.queryByTestId("eps-spinner")).not.toBeInTheDocument()
    })
  })

  it("renders the page with heading", () => {
    renderComponent("")
    expect(screen.getByRole("heading", {name: "Prescription details"})).toBeInTheDocument()
  })

  it("sets context when the prescription get resolves", async () => {
    const payload = {
      ...mockPrescriptionDetailsResponse
    }

      ; (http.get as jest.Mock).mockResolvedValue({status: 200, data: payload})

    renderComponent("SUCCESS_ID", signedInAuthState)

    await waitFor(() => {
      expect(window.__mockedPrescriptionInformation).toEqual(payload)
      expect(window.__mockedPatientDetails).toEqual(payload.patientDetails)
    })
  })

  it("does not set context if no prescriptionId is provided", () => {
    renderComponent("")
    expect(window.__mockedPrescriptionInformation).toBeUndefined()
    expect(window.__mockedPatientDetails).toBeUndefined()
  })
})
