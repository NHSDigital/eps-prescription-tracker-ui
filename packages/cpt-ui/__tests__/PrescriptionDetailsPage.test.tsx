import React, {useState} from "react"
import {MemoryRouter, useNavigate, useSearchParams} from "react-router-dom"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"
import {MockPrescriptionInformationProvider} from "../__mocks__/MockPrescriptionInformationProvider"

import {
  PrescriptionDetailsResponse,
  PrescriberOrganisationSummary,
  OrganisationSummary
} from "@cpt-ui-common/common-types/src/prescriptionDetails"

import {render, screen, waitFor} from "@testing-library/react"

import {AuthContext, AuthContextType} from "@/context/AuthProvider"

import {FRONTEND_PATHS} from "@/constants/environment"

import http from "@/helpers/axios"

import PrescriptionDetailsPage from "@/pages/PrescriptionDetailsPage"
import {LOADING_FULL_PRESCRIPTION} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

jest.mock("@/helpers/axios", () => ({
  get: jest.fn()
}))

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
  user: null,
  error: null,
  idToken: null,
  accessToken: null,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut
}

// Auth provider mock
const MockAuthProvider = ({
  children,
  initialState = defaultAuthState
}: {
  children: React.ReactNode;
  initialState?: AuthContextType;
}) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    ...initialState,
    cognitoSignIn: async (input) => {
      mockCognitoSignIn(input)
      // Simulate a sign-in update
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: true,
        user: {
          username:
            (input?.provider as { custom: string })?.custom || "mockUser",
          userId: "mock-user-id"
        },
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        idToken: {toString: () => "mockIdToken"} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accessToken: {toString: () => "mockAccessToken"} as any
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
jest.mock("@/components/SiteDetailsCards", () => ({

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

  ;(useSearchParams as jest.Mock).mockReturnValue([new URLSearchParams(queryString)])

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
    (http.get as jest.Mock).mockImplementation(() => new Promise(() => {}))
    renderComponent("C0C757-A83008-C2D93L")

    expect(screen.getByTestId("eps-spinner")).toBeInTheDocument()
  })

  it("navigates to prescription not found when prescriptionId is missing", async () => {
    renderComponent("") // No query string

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
    })
  })

  it("navigates to prescription not found on unknown prescriptionId", async () => {
    (http.get as jest.Mock).mockRejectedValue(new Error("HTTP error"))

    renderComponent("UNKNOWN_ID")

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
    })
  })

  it("renders SiteDetailsCards with correct data for a successful HTTP GET response", async () => {
    const payload: PrescriptionDetailsResponse = {
      patientDetails: {
        identifier: "123",
        name: {given: "John", family: "Doe"},
        gender: "male",
        birthDate: "1980-01-01",
        address: {
          text: "Some address",
          line: "123 Street",
          city: "City",
          district: "District",
          postalCode: "LS11TW",
          type: "home",
          use: "primary"
        }
      },
      prescriptionID: "SUCCESS_ID",
      typeCode: "type",
      statusCode: "status",
      issueDate: "2020-01-01",
      instanceNumber: 1,
      maxRepeats: 0,
      daysSupply: "30",
      prescriptionPendingCancellation: false,
      prescribedItems: [],
      dispensedItems: [],
      messageHistory: [],
      prescriberOrganisation: {
        organisationSummaryObjective: {
          name: "Fiji surgery",
          odsCode: "FI05964",
          address: "90 YARROW LANE, FINNSBURY, E45 T46",
          telephone: "01232 231321",
          prescribedFrom: "England"
        }
      },
      nominatedDispenser: {
        organisationSummaryObjective: {
          name: "Some Nominated Dispenser",
          odsCode: "NOM123",
          address: "Nominated Address",
          telephone: "1234567890"
        }
      },
      currentDispenser: [{
        organisationSummaryObjective: {
          name: "Cohens chemist",
          odsCode: "FV519",
          address: "22 RUE LANE, CHISWICK, KT19 D12",
          telephone: "01943 863158"
        }
      }]
    };

    (http.get as jest.Mock).mockResolvedValue({status: 200, data: payload})

    renderComponent("SUCCESS_ID")

    await waitFor(() => {
      expect(screen.getByTestId("site-details-cards")).toBeInTheDocument()
    })

    const cards = screen.getByTestId("site-details-cards")
    const props = JSON.parse(cards.textContent || "{}")

    expect(props.prescriber).toEqual(payload.prescriberOrganisation.organisationSummaryObjective)
    if (!payload.currentDispenser || !payload.nominatedDispenser) {
      throw new Error("Expected the payload to be populated")
    }
    expect(props.dispenser).toEqual(payload.currentDispenser[0].organisationSummaryObjective)
    expect(props.nominatedDispenser).toEqual(payload.nominatedDispenser.organisationSummaryObjective)
  })

  it("displays loading message and spinner while fetching data", async () => {
    renderComponent("EC5ACF-A83008-733FD3")

    // Check that the loading message is rendered
    const loadingHeading = screen.getByRole("heading", {
      name: LOADING_FULL_PRESCRIPTION
    })
    expect(loadingHeading).toBeInTheDocument()

    // Check that the spinner is rendered
    const spinner = screen.getByTestId("eps-spinner")
    expect(spinner).toBeInTheDocument()

    // Wait for loading to finish and spinner to disappear
    await waitFor(() => {
      expect(screen.queryByTestId("eps-spinner")).not.toBeInTheDocument()
    })
  })

  it("renders the page with heading", () => {
    renderComponent("")
    expect(screen.getByRole("heading", {name: "Prescription details"})).toBeInTheDocument()
  })

  it("sets context for acute prescription", async () => {
    renderComponent("C0C757-A83008-C2D93O")

    await waitFor(() => {
      expect(window.__mockedPrescriptionInformation).toEqual({
        prescriptionId: "C0C757-A83008-C2D93O",
        issueDate: "18-Jan-2024",
        status: "All items dispensed",
        type: "Acute",
        isERD: false,
        instanceNumber: undefined,
        maxRepeats: undefined,
        daysSupply: undefined
      })

      expect(window.__mockedPatientDetails).toEqual({
        nhsNumber: "5900009890",
        prefix: "Mr",
        suffix: "",
        given: "William",
        family: "Wolderton",
        gender: "male",
        dateOfBirth: "01-Nov-1988",
        address: {
          line1: "55 OAK STREET",
          line2: "OAK LANE",
          city: "Leeds",
          postcode: "LS1 1XX"
        }
      })
    })
  })

  it("sets context for eRD prescription", async () => {
    renderComponent("EC5ACF-A83008-733FD3")

    await waitFor(() => {
      expect(window.__mockedPrescriptionInformation).toEqual({
        prescriptionId: "EC5ACF-A83008-733FD3",
        issueDate: "22-Jan-2025",
        status: "All items dispensed",
        type: "eRD",
        isERD: true,
        instanceNumber: 2,
        maxRepeats: 6,
        daysSupply: 28
      })

      expect(window.__mockedPatientDetails).toEqual({
        nhsNumber: "5900009890",
        prefix: "Ms",
        suffix: "",
        given: "Janet",
        family: "Piper",
        gender: null,
        dateOfBirth: null,
        address: null
      })
    })
  })

  it("does not set context if no prescriptionId is provided", () => {
    renderComponent("")
    expect(window.__mockedPrescriptionInformation).toBeUndefined()
    expect(window.__mockedPatientDetails).toBeUndefined()
  })
})
