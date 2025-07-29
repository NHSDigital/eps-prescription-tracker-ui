import React from "react"
import {MemoryRouter, Route, Routes} from "react-router-dom"

import {render, screen, waitFor} from "@testing-library/react"
import "@testing-library/jest-dom"

import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {STRINGS} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

import {PrescriptionStatus, SearchResponse, TreatmentType} from "@cpt-ui-common/common-types"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"

import {AxiosError, AxiosHeaders, AxiosRequestHeaders} from "axios"

import axios from "@/helpers/axios"
import {logger} from "@/helpers/logger"
jest.mock("@/helpers/axios")

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>

import PrescriptionListPage from "@/pages/PrescriptionListPage"
import {AuthContextType, AuthContext} from "@/context/AuthProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"

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
  isConcurrentSession: false,
  multipleSessions: false,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut,
  clearAuthState: jest.fn(),
  updateSelectedRole: jest.fn(),
  forceCognitoLogout: jest.fn(),
  updateTrackerUserInfo: jest.fn()
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
      isDeleted: false,
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
      isDeleted: false,
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
      isDeleted: false,
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
      isDeleted: false,
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
      isDeleted: false,
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
      isDeleted: false,
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

const emptyResultsMock = {
  status: 200,
  data: {
    patient: {},
    currentPrescriptions: [],
    pastPrescriptions: [],
    futurePrescriptions: []
  }
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

const renderWithRouter = (
  route: string,
  authState: AuthContextType = signedInAuthState,
  searchState: SearchProviderContextType = defaultSearchState
) => {
  return render(
    <AuthContext.Provider value={authState}>
      <SearchContext.Provider value={searchState}>
        <MockPatientDetailsProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="*" element={<Dummy404 />} />
              <Route path={FRONTEND_PATHS.LOGIN} element={<div data-testid="login-page-shown" />} />
              <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT} element={<PrescriptionListPage />} />
              <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_PAST} element={<PrescriptionListPage />} />
              <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE} element={<PrescriptionListPage />} />
            </Routes>
          </MemoryRouter>
        </MockPatientDetailsProvider>
      </SearchContext.Provider>
    </AuthContext.Provider>
  )
}

export function createAxiosError(status: number): AxiosError {
  const axiosError = new Error("Mocked Axios error") as AxiosError

  axiosError.isAxiosError = true
  axiosError.config = {
    url: "https://mock-api",
    method: "get",
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    headers: {} as AxiosRequestHeaders,
    data: null
  }

  axiosError.response = {
    status,
    statusText: "",
    headers: {},
    config: axiosError.config,
    data: {}
  }

  axiosError.toJSON = () => ({})
  return axiosError
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
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "ABC123-A83008-C2D93O"
      }
    )

    expect(screen.getByText("Loading...")).toBeVisible()
  })

  it("renders the component with the correct title and heading", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "C0C757-A83008-C2D93O"
      }
    )
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

  it("handles expired session by redirecting to login page", async () => {
    const headers = new AxiosHeaders({})
    mockedAxios.get.mockRejectedValue(new AxiosError(undefined, undefined, undefined, undefined,
      {
        status: 401,
        statusText: "Unauthorized",
        headers,
        config: {headers},
        data: {message: "Session expired or invalid. Please log in again.", restartLogin: true}
      }
    ))

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "C0C757-A83008-C2D93O"
      }
    )

    await waitFor(() => {
      expect(screen.getByTestId("login-page-shown")).toBeInTheDocument()
    })
  })

  it("shows the correct number of results", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "C0C757-A83008-C2D93O"
      }
    )

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

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "C0C757-A83008-C2D93O"
      }
    )
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const resultsCount = screen.getByTestId("results-count")
      expect(resultsCount).toHaveTextContent(
        `${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}3${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}`
      )

      const tabCurrentHeading = screen
        .getByTestId(`eps-tab-heading ${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}`)

      expect(tabCurrentHeading).toHaveTextContent("(3)")
      const tabPastHeading = screen
        .getByTestId(`eps-tab-heading ${FRONTEND_PATHS.PRESCRIPTION_LIST_PAST}`)
      expect(tabPastHeading).toHaveTextContent("(0)")

      const tabFutureHeading = screen
        .getByTestId(`eps-tab-heading ${FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE}`)
      expect(tabFutureHeading).toHaveTextContent("(0)")
    })
  })

  it("logs an error when no query parameters are present", async () => {
    const loggerErrorSpy = jest.spyOn(logger, "error").mockImplementation(() => {})

    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)

    await waitFor(() => {
      expect(loggerErrorSpy).toHaveBeenCalledWith("No query parameter provided.")
    })

    loggerErrorSpy.mockRestore()
  })

  it("sets the back link to the prescription ID search when prescriptionId query parameter is present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })
    mockGetAllSearchParameters.mockReturnValue({
      prescriptionId: "ABC123-A83008-C2D93O"
    })

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "ABC123-A83008-C2D93O"
      }
    )
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const backLink = screen.getByTestId("go-back-link")
      expect(backLink).toHaveAttribute(
        "href",
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      )
    })
  })

  it("sets the back link to the NHS number search when nhsNumber query parameter is present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })
    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        nhsNumber: "1234567890"
      }
    )

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const backLink = screen.getByTestId("go-back-link")
      expect(backLink).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)
    })
  })

  it("sets back link to prescription list when both prescriptionId and nhsNumber are present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    const url = FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT
    renderWithRouter(
      url,
      signedInAuthState,
      {
        ...defaultSearchState,
        nhsNumber: "1234567890",
        prescriptionId: "ABC123-A83008-C2D93O"
      }

    )

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const backLink = screen.getByTestId("go-back-link")
      expect(backLink).toHaveAttribute("href", FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
    })
  })

  it("renders the prescription not found message when prescriptionId query returns no results", async () => {
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

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "ABC123-ABC123-ABC123"
      }
    )

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const heading = screen.getByTestId("presc-not-found-heading")
      expect(heading).toHaveTextContent("No prescriptions found")
    })
  })

  it("renders prescription not found message with back link to prescriptionId search when query fails", async () => {
    mockedAxios.get.mockRejectedValue(createAxiosError(404))

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "002F5E-A83008-497F1Z"
      }
    )
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const heading = screen.getByTestId("presc-not-found-heading")
      expect(heading).toHaveTextContent(STRINGS.heading)

      const backLink = screen.getByTestId("go-back-link")
      expect(backLink).toHaveAttribute(
        "href",
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      )
    })
  })

  it("renders prescription not found message with back link to NHS number search when query fails", async () => {
    mockedAxios.get.mockRejectedValue(createAxiosError(404))

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        nhsNumber: "32165649870"
      }
    )

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const heading = screen.getByTestId("presc-not-found-heading")
      expect(heading).toHaveTextContent(STRINGS.heading)

      const backLink = screen.getByTestId("go-back-link")
      expect(backLink).toHaveAttribute(
        "href",
        FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER
      )
    })
  })

  it("renders prescription not found message when API returns no prescriptions for a valid NHS number", async () => {
    mockedAxios.get.mockResolvedValue(emptyResultsMock)

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        nhsNumber: "32165649870"
      }
    )
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const heading = screen.getByTestId("presc-not-found-heading")
      expect(heading).toHaveTextContent(STRINGS.heading)

      const backLink = screen.getByTestId("go-back-link")
      expect(backLink).toHaveAttribute(
        "href",
        FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER
      )
    })
  })

  it("renders not found message when API returns 404", async () => {
    mockedAxios.get.mockRejectedValue({
      isAxiosError: true,
      response: {status: 404}
    })

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        nhsNumber: "32165649870"
      }

    )

    await waitFor(() => {
      expect(screen.getByTestId("presc-not-found-heading")).toHaveTextContent(STRINGS.heading)
    })
  })

  it("displays UnknownErrorMessage for real network/server errors", async () => {
    mockedAxios.get.mockRejectedValue(new Error("AWS CloudFront issue"))

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        nhsNumber: "32165649870"
      }
    )

    await waitFor(() => {
      const heading = screen.getByTestId("unknown-error-heading")
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent("Sorry, there is a problem with this service")
    })
  })

  it("renders UnknownErrorMessage when server responds with unexpected error", async () => {
    mockedAxios.get.mockRejectedValue({response: {status: 500}})

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        nhsNumber: "32165649870"
      }

    )

    await waitFor(() => {
      const heading = screen.getByTestId("unknown-error-heading")
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent("Sorry, there is a problem with this service")
    })
  })
})
