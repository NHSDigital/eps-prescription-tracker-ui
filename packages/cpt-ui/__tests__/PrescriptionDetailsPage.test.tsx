import React, {useState} from "react"
import {useNavigate, useSearchParams} from "react-router-dom"

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
  searchParamString: string = "",
  initialAuthState: AuthContextType = defaultAuthState
) => {
  (useSearchParams as jest.Mock).mockReturnValue([new URLSearchParams(searchParamString)])
  return render(
    <MockAuthProvider initialState={initialAuthState}>
      <PrescriptionDetailsPage />
    </MockAuthProvider>
  )
}

describe("PrescriptionDetailsPage", () => {
  const mockNavigate = jest.fn()

  beforeEach(() => {
    mockNavigate.mockClear();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate)
  })

  it("renders spinner while loading", async () => {
    // pending HTTP request.
    (http.get as jest.Mock).mockImplementation(() => new Promise(() => {}))
    renderComponent("prescriptionId=C0C757-A83008-C2D93O")

    expect(screen.getByTestId("eps-spinner")).toBeInTheDocument()
  })

  it("navigates to prescription not found when prescriptionId is missing", async () => {
    renderComponent("") // No query string

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
    })
  })

  // FIXME: REMOVE THIS WHEN THE MOCK DATA IS PULL OUT!!!
  it("renders SiteDetailsCards with mock data on known prescriptionId (C0C757-A83008-C2D93O)", async () => {
    // failed http request
    (http.get as jest.Mock).mockRejectedValue(new Error("HTTP error"))

    renderComponent("prescriptionId=C0C757-A83008-C2D93O")

    // Wait for the async useEffect to update the UI.
    await waitFor(() => {
      expect(screen.getByTestId("site-details-cards")).toBeInTheDocument()
    })

    const cards = screen.getByTestId("site-details-cards")
    const props = JSON.parse(cards.textContent || "{}")

    // These are the hardcoded mock values defined on the component file.
    expect(props.prescriber).toEqual({
      name: "Fiji surgery",
      odsCode: "FI05964",
      address: "90 YARROW LANE, FINNSBURY, E45 T46",
      telephone: "01232 231321",
      prescribedFrom: "England"
    })
    expect(props.dispenser).toEqual({
      name: "Cohens chemist",
      odsCode: "FV519",
      address: "22 RUE LANE, CHISWICK, KT19 D12",
      telephone: "01943 863158"
    })
    expect(props.nominatedDispenser).toEqual({
      name: "Cohens chemist",
      odsCode: "FV519",
      address: "22 RUE LANE, CHISWICK, KT19 D12",
      telephone: "01943 863158"
    })
  })

  it("navigates to prescription not found on unknown prescriptionId", async () => {
    (http.get as jest.Mock).mockRejectedValue(new Error("HTTP error"))

    renderComponent("prescriptionId=UNKNOWN_ID")

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

    // Simulate a successful HTTP GET.
    (http.get as jest.Mock).mockResolvedValue({status: 200, data: payload})

    renderComponent("prescriptionId=SUCCESS_ID")

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
})
