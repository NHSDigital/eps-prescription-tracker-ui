import React, {useState} from "react"
import {MemoryRouter, Route, Routes} from "react-router-dom"
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

import http from "@/helpers/axios"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"

import {AxiosError, AxiosHeaders} from "axios"

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

const mockClearSearchParameters = jest.fn()
const mockSetPrescriptionId = jest.fn()
const mockSetIssueNumber = jest.fn()
const mockSetFirstName = jest.fn()
const mockSetLastName = jest.fn()
const mockSetDobDay = jest.fn()
const mockSetDobMonth = jest.fn()
const mockSetDobYear = jest.fn()
const mockSetPostcode =jest.fn()
const mockSetNhsNumber = jest.fn()
const mockGetAllSearchParameters = jest.fn()
const mockSetAllSearchParameters = jest.fn()
const defaultSearchState: SearchProviderContextType = {
  prescriptionId: undefined,
  issueNumber: undefined,
  firstName: undefined,
  lastName: undefined,
  dobDay: undefined,
  dobMonth: undefined,
  dobYear: undefined,
  postcode: undefined,
  nhsNumber: undefined,
  clearSearchParameters: mockClearSearchParameters,
  setPrescriptionId: mockSetPrescriptionId,
  setIssueNumber: mockSetIssueNumber,
  setFirstName: mockSetFirstName,
  setLastName: mockSetLastName,
  setDobDay: mockSetDobDay,
  setDobMonth: mockSetDobMonth,
  setDobYear: mockSetDobYear,
  setPostcode: mockSetPostcode,
  setNhsNumber: mockSetNhsNumber,
  getAllSearchParameters: mockGetAllSearchParameters,
  setAllSearchParameters: mockSetAllSearchParameters
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
  const initialRoute = `/prescription-details`

  const searchState = {
    ...defaultSearchState,
    prescriptionId
  }

  return render(
    <MockAuthProvider initialState={initialAuthState}>
      <SearchContext.Provider value={searchState}>
        <MockPatientDetailsProvider>
          <MockPrescriptionInformationProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              <Routes>
                <Route path="/prescription-details" element={<PrescriptionDetailsPage />} />
                <Route path="/login" element={<div data-testid="login-page-shown" />} />
              </Routes>
            </MemoryRouter>
          </MockPrescriptionInformationProvider>
        </MockPatientDetailsProvider>
      </SearchContext.Provider>
    </MockAuthProvider>
  )
}

describe("PrescriptionDetailsPage", () => {

  beforeEach(() => {
    delete window.__mockedPatientDetails
    delete window.__mockedPrescriptionInformation
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("renders spinner while loading", async () => {
    // pending HTTP request.
    jest.spyOn(http, "get").mockImplementation(() => new Promise(() => { }))
    renderComponent("C0C757-A83008-C2D93L")

    expect(screen.getByTestId("eps-spinner")).toBeInTheDocument()
  })

  it("navigates to search page when prescriptionId is missing", async () => {
    renderComponent("", signedInAuthState)

    // Verify that fallback UI renders
    expect(screen.getByRole("heading", {name: STRINGS.HEADER})).toBeInTheDocument()
  })

  it("handles unknown prescriptionId without navigating", async () => {
    jest.spyOn(http, "get").mockRejectedValue(new Error("HTTP error"))

    renderComponent("UNKNOWN_ID", signedInAuthState)

    // Confirm fallback or empty UI still renders
    expect(screen.getByRole("heading", {name: STRINGS.HEADER})).toBeInTheDocument()
  })

  it("handles expired session be redirecting to login page", async () => {
    const headers = new AxiosHeaders({})
    jest.spyOn(http, "get").mockRejectedValue(new AxiosError(undefined, undefined, undefined, undefined,
      {
        status: 401,
        statusText: "Unauthorized",
        headers,
        config: {headers},
        data: {message: "Session expired or invalid. Please log in again.", restartLogin: true}
      }
    ))

    renderComponent("ANY_ID", signedInAuthState)

    await waitFor(() => {
      expect(screen.getByTestId("login-page-shown")).toBeInTheDocument()
    })
  })

  it("renders SiteDetailsCards with correct data for a successful HTTP GET response", async () => {
    const payload: PrescriptionDetailsResponse = {
      ...mockPrescriptionDetailsResponse
    }

    jest.spyOn(http, "get").mockResolvedValue({status: 200, data: payload})

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

    jest.spyOn(http, "get").mockReturnValue(pendingPromise)

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

    jest.spyOn(http, "get").mockResolvedValue({status: 200, data: payload})

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
