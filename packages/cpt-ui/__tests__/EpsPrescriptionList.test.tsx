import React from "react"
import {MemoryRouter, Route, Routes} from "react-router-dom"

import {render, screen, waitFor} from "@testing-library/react"
import "@testing-library/jest-dom"

import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

import {PrescriptionStatus, SearchResponse, TreatmentType} from "@cpt-ui-common/common-types"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"

import axios from "@/helpers/axios"
jest.mock("@/helpers/axios")

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>

import PrescriptionListPage from "@/pages/PrescriptionListPage"
import {AuthContextType, AuthContext} from "@/context/AuthProvider"

const mockCognitoSignIn = jest.fn()
const mockCognitoSignOut = jest.fn()

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

const mockSearchResponse: SearchResponse = {
  patient: {
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
  },
  currentPrescriptions: [
    {
      prescriptionId: "C0C757-A83008-C2D93O",
      statusCode: PrescriptionStatus.TO_BE_DISPENSED,
      issueDate: "2025-03-01",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "209E3D-A83008-327F9F",
      statusCode: PrescriptionStatus.WITH_DISPENSER,
      issueDate: "2025-02-15",
      prescriptionTreatmentType: TreatmentType.ACUTE,
      issueNumber: 2,
      maxRepeats: 3,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "RX003",
      statusCode: PrescriptionStatus.WITH_DISPENSER_ACTIVE,
      issueDate: "2025-03-10",
      prescriptionTreatmentType: TreatmentType.ERD,
      issueNumber: 3,
      maxRepeats: 4,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: true
    }
  ],
  pastPrescriptions: [
    {
      prescriptionId: "RX004",
      statusCode: PrescriptionStatus.DISPENSED,
      issueDate: "2025-01-15",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 2,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "RX005",
      statusCode: PrescriptionStatus.NOT_DISPENSED,
      issueDate: "2024-12-20",
      prescriptionTreatmentType: TreatmentType.ACUTE,
      issueNumber: 1,
      maxRepeats: 1,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }
  ],
  futurePrescriptions: [
    {
      prescriptionId: "RX006",
      statusCode: PrescriptionStatus.FUTURE_DATED_PRESCRIPTION,
      issueDate: "2025-04-01",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 10,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }
  ]
}

function Dummy404() {
  return (
    <main>
      <div>
        <p data-testid="dummy-no-prescription-page">Dummy page</p>
      </div>
    </main>
  )
}

const renderWithRouter = (route: string, authState: AuthContextType = signedInAuthState) => {
  return render(
    <AuthContext.Provider value={authState}>
      <MockPatientDetailsProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="*" element={<Dummy404 />} />
            <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT} element={<PrescriptionListPage />} />
            <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_PAST} element={<PrescriptionListPage />} />
            <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE} element={<PrescriptionListPage />} />
          </Routes>
        </MemoryRouter>
      </MockPatientDetailsProvider>
    </AuthContext.Provider>
  )
}

describe("PrescriptionListPage", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("renders the loading spinner before the request resolves", () => {
    // Create a pending promise that never resolves.
    const pendingPromise = new Promise(() => { })
    mockedAxios.get.mockReturnValue(pendingPromise)

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?prescriptionId=ABC123-A83008-C2D93O"
    )

    expect(screen.getByText("Loading...")).toBeVisible()
  })

  it("renders the component with the correct title and heading", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?prescriptionId=C0C757-A83008-C2D93O")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const heading = screen.getByTestId("prescription-list-heading")
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent(PRESCRIPTION_LIST_PAGE_STRINGS.HEADING)

      const resultsHeading = screen.getByTestId("results-heading")
      expect(resultsHeading).toBeInTheDocument()

      // Check that the component renders the prescription results list container
      const resultsListContainer = screen.getByTestId("prescription-results-list")
      expect(resultsListContainer).toBeInTheDocument()
    })
  })

  it("shows the correct number of results", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?prescriptionId=C0C757-A83008-C2D93O")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const resultsCount = screen.getByTestId("results-count")
      expect(resultsCount).toHaveTextContent(
        `${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}6${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}`
      )
    })
  })

  it("shows 0 when there are no results", async () => {
    const noResults: SearchResponse = {
      patient: mockSearchResponse.patient,
      currentPrescriptions: mockSearchResponse.currentPrescriptions,
      pastPrescriptions: [],
      futurePrescriptions: []
    }
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: noResults
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?prescriptionId=C0C757-A83008-C2D93O")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const resultsCount = screen.getByTestId("results-count")
      expect(resultsCount).toHaveTextContent(
        `${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}3${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}`
      )

      const tabCurrentHeading = screen
        .getByTestId(`eps-tab-heading ${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?prescriptionId=C0C757-A83008-C2D93O`)

      expect(tabCurrentHeading).toHaveTextContent("(3)")
      const tabPastHeading = screen
        .getByTestId(`eps-tab-heading ${FRONTEND_PATHS.PRESCRIPTION_LIST_PAST}?prescriptionId=C0C757-A83008-C2D93O`)
      expect(tabPastHeading).toHaveTextContent("(0)")

      const tabFutureHeading = screen
        .getByTestId(`eps-tab-heading ${FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE}?prescriptionId=C0C757-A83008-C2D93O`)
      expect(tabFutureHeading).toHaveTextContent("(0)")
    })
  })

  it("logs an error when no query parameters are present", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("No query parameter provided.")
    })

    consoleErrorSpy.mockRestore()
  })

  it("sets the back link to the prescription ID search when prescriptionId query parameter is present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?prescriptionId=ABC123-A83008-C2D93O")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    // We need to wait for the useEffect to run
    await waitFor(() => {
      const linkContainer = screen.getByTestId("go-back-link")
      expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET)
    })
  })

  it("sets the back link to the NHS number search when nhsNumber query parameter is present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?nhsNumber=1234567890")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    // We need to wait for the useEffect to run
    await waitFor(() => {
      const linkContainer = screen.getByTestId("go-back-link")
      expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET)
    })
  })

  it("renders the not found message when prescriptionId query returns no results", async () => {
    const noResults: SearchResponse = {
      patient: mockSearchResponse.patient,
      currentPrescriptions: [],
      pastPrescriptions: [],
      futurePrescriptions: []
    }

    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: noResults
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?prescriptionId=ABC123-ABC123-ABC123")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const heading = screen.getByTestId("presc-not-found-heading")
      expect(heading).toHaveTextContent("No prescriptions found")
    })
  })

  it("navigates back to the prescription ID search when prescriptionId query fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Server error"))

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?prescriptionId=002F5E-A83008-497F1Z")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const dummyTag = screen.getByTestId("dummy-no-prescription-page")
      expect(dummyTag).toBeInTheDocument()
    })
  })

  it("navigates back to the NHS number search when nhsNumber query fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Server error"))

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT + "?nhsNumber=32165649870")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const dummyTag = screen.getByTestId("dummy-no-prescription-page")
      expect(dummyTag).toBeInTheDocument()
    })
  })
})
