/* eslint-disable max-len */
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

jest.mock("@/constants/environment", () => ({
  AUTH_CONFIG: {
    USER_POOL_ID: "test-user-pool-id",
    USER_POOL_CLIENT_ID: "test-client-id",
    HOSTED_LOGIN_DOMAIN: "test-domain",
    REDIRECT_SIGN_IN: "http://localhost/",
    REDIRECT_SIGN_OUT: "http://localhost/",
    REDIRECT_SESSION_SIGN_OUT: "http://localhost/"
  },
  ENV_CONFIG: {
    TARGET_ENVIRONMENT: "test",
    API_DOMAIN_OVERRIDE: undefined,
    BASE_PATH: "site",
    LOCAL_DEV: false,
    BASE_URL: "http://localhost",
    BASE_URL_PATH: "http://localhost/site/"
  },
  APP_CONFIG: {
    SERVICE_NAME: "test-service",
    COMMIT_ID: "test-commit",
    VERSION_NUMBER: "1.0.0",
    REACT_LOG_LEVEL: "debug"
  },
  API_ENDPOINTS: {
    TRACKER_USER_INFO: "/api/tracker-user-info",
    SELECTED_ROLE: "/api/selected-role",
    PRESCRIPTION_LIST: "/api/prescription-list",
    CIS2_SIGNOUT_ENDPOINT: "/api/cis2-signout",
    PRESCRIPTION_DETAILS: "/api/prescription-details",
    PATIENT_SEARCH: "/api/patient-search",
    SESSION_MANAGEMENT: "/api/session-management"
  },
  RUM_CONFIG: {
    GUEST_ROLE_ARN: "test-guest-role-arn",
    IDENTITY_POOL_ID: "test-identity-pool",
    ENDPOINT: "https://dataplane.rum.eu-west-2.amazonaws.com",
    APPLICATION_ID: "test-app-id",
    REGION: "eu-west-2",
    VERSION: "1.0.0",
    ALLOW_COOKIES: true,
    ENABLE_XRAY: false,
    SESSION_SAMPLE_RATE: 1,
    TELEMETRIES: [],
    RELEASE_ID: "test-commit"
  },
  FRONTEND_PATHS: {
    PRESCRIPTION_LIST_CURRENT: "/prescription-list-current",
    PRESCRIPTION_LIST_FUTURE: "/prescription-list-future",
    PRESCRIPTION_LIST_PAST: "/prescription-list-past",
    COOKIES: "/cookies",
    LOGIN: "/login",
    LOGOUT: "/logout",
    SESSION_LOGGED_OUT: "/session-logged-out",
    SELECT_YOUR_ROLE: "/select-your-role",
    YOUR_SELECTED_ROLE: "/your-selected-role",
    CHANGE_YOUR_ROLE: "/change-your-role",
    SEARCH_BY_PRESCRIPTION_ID: "/search-by-prescription-id",
    SEARCH_BY_NHS_NUMBER: "/search-by-nhs-number",
    SEARCH_BY_BASIC_DETAILS: "/search-by-basic-details",
    PRESCRIPTION_DETAILS_PAGE: "/prescription-details",
    PATIENT_SEARCH_RESULTS: "/patient-search-results",
    PATIENT_NOT_FOUND: "/patient-not-found",
    NO_PRESCRIPTIONS_FOUND: "/no-prescriptions-found",
    PRIVACY_NOTICE: "/privacy-notice",
    COOKIES_SELECTED: "/cookies-selected",
    SESSION_SELECTION: "/select-active-session",
    NOT_FOUND: "/notfound"
  },
  PUBLIC_PATHS: ["/login", "/cookies", "/privacy-notice"]
}))

import PrescriptionListPage from "@/pages/PrescriptionListPage"
import NoPrescriptionsFoundPage from "@/pages/NoPrescriptionsFoundPage"
import {AuthContextType, AuthContext} from "@/context/AuthProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>

const mockGetBackPath = jest.fn()
const mockSetOriginalSearchPage = jest.fn()
const mockCaptureOriginalSearchParameters = jest.fn()
const mockGetRelevantSearchParameters = jest.fn()
const mockNavigationContext = {
  pushNavigation: jest.fn(),
  goBack: jest.fn(),
  getBackPath: mockGetBackPath,
  setOriginalSearchPage: mockSetOriginalSearchPage,
  captureOriginalSearchParameters: mockCaptureOriginalSearchParameters,
  getOriginalSearchParameters: jest.fn(),
  getRelevantSearchParameters: mockGetRelevantSearchParameters,
  startNewNavigationSession: jest.fn()
}

jest.mock("@/context/NavigationProvider", () => ({
  ...jest.requireActual("@/context/NavigationProvider"),
  useNavigationContext: () => mockNavigationContext
}))

const mockGetBackLink = jest.fn()
const mockGoBack = jest.fn()
jest.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: () => ({
    getBackLink: mockGetBackLink,
    goBack: mockGoBack
  })
}))

const mockCognitoSignIn = jest.fn()
const mockCognitoSignOut = jest.fn()

const signedInAuthState: AuthContextType = {
  isSignedIn: true,
  authStatus: "signed_in",
  isSigningIn: false,
  invalidSessionCause: undefined,
  user: "testUser",
  error: null,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  sessionId: undefined,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut,
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  isSigningOut: false
}

const mockClearSearchParameters = jest.fn()
const mockSetPrescriptionId = jest.fn()
const mockSetIssueNumber = jest.fn()
const mockSetFirstName = jest.fn()
const mockSetLastName = jest.fn()
const mockSetDobDay = jest.fn()
const mockSetDobMonth = jest.fn()
const mockSetDobYear = jest.fn()
const mockSetPostcode = jest.fn()
const mockSetNhsNumber = jest.fn()
const mockGetAllSearchParameters = jest.fn()
const mockSetAllSearchParameters = jest.fn()
const mockSetSearchType = jest.fn()
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
  searchType: undefined,
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
  setAllSearchParameters: mockSetAllSearchParameters,
  setSearchType: mockSetSearchType
}

const mockSearchResponse: SearchResponse = {
  patient: {
    nhsNumber: "5900009890",
    givenName: ["William"],
    familyName: "Wolderton",
    gender: "male",
    dateOfBirth: "01-Nov-1988",
    address: ["55 OAK STREET", "OAK LANE", "Leeds"],
    postcode: "LS1 1XX"
  },
  patientFallback: false,
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
      statusCode: PrescriptionStatus.AWAITING_RELEASE_READY,
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
      statusCode: PrescriptionStatus.NOT_DISPENSED,
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
      statusCode:PrescriptionStatus.CLAIMED,
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
            <NavigationProvider>
              <Routes>
                <Route path="*" element={<Dummy404 />} />
                <Route path={FRONTEND_PATHS.LOGIN} element={<div data-testid="login-page-shown" />} />
                <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT} element={<PrescriptionListPage />} />
                <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_PAST} element={<PrescriptionListPage />} />
                <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE} element={<PrescriptionListPage />} />
                <Route path={FRONTEND_PATHS.NO_PRESCRIPTIONS_FOUND} element={<NoPrescriptionsFoundPage />} />
              </Routes>
            </NavigationProvider>
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
    jest.clearAllMocks()

    mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    mockGetRelevantSearchParameters.mockReturnValue({})

    mockGetBackLink.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })

  afterEach(() => {
    // cleans up DOM
    document.body.innerHTML = ""
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

    expect(screen.getByTestId("spinner")).toBeInTheDocument()
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
      expect(mockCognitoSignOut).toHaveBeenCalled()
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
      patientFallback: false,
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

      // Check that the visible text contains the expected format, ignoring accessibility text
      expect(tabCurrentHeading.textContent).toMatch(/Current prescriptions \(3/)
      const tabPastHeading = screen
        .getByTestId(`eps-tab-heading ${FRONTEND_PATHS.PRESCRIPTION_LIST_PAST}`)
      expect(tabPastHeading.textContent).toMatch(/Past prescriptions \(0/)

      const tabFutureHeading = screen
        .getByTestId(`eps-tab-heading ${FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE}`)
      expect(tabFutureHeading.textContent).toMatch(/Future prescriptions \(0/)
    })
  })

  it("logs when no query parameters are present", async () => {
    const loggerInfoSpy = jest.spyOn(logger, "info").mockImplementation(() => {})

    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)

    await waitFor(() => {
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "No search parameter provided - redirecting to prescription ID search"
      )
    })

    loggerInfoSpy.mockRestore()
  })

  it("sets the back link to the prescription ID search when prescriptionId query parameter is present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })
    mockGetBackLink.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)

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
    mockGetBackLink.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)

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
      expect(backLink).toHaveAttribute(
        "href",
        FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER
      )
    })
  })

  it("sets back link to prescription ID search when both prescriptionId and nhsNumber are present on prescription list page", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })
    mockGetBackLink.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)

    const url = FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT
    renderWithRouter(url, signedInAuthState, {
      ...defaultSearchState,
      prescriptionId: "ABC123-A83008-C2D93O",
      nhsNumber: "1234567890"
    })
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const backLink = screen.getByTestId("go-back-link")
      expect(backLink).toHaveAttribute(
        "href",
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      )
    })
  })

  it("uses nhsNumber for API call when both prescriptionId and nhsNumber are present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    const url = FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT
    renderWithRouter(url, signedInAuthState, {
      ...defaultSearchState,
      prescriptionId: "ABC123-A83008-C2D93O",
      nhsNumber: "1234567890"
    })

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/prescription-list", {
        params: new URLSearchParams([["nhsNumber", "1234567890"]])
      })
    })
  })

  it("sets back link to prescription ID search when navigating to future prescriptions tab", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })
    mockGetBackLink.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE,
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

  it("sets back link to NHS number search when navigating to past prescriptions tab", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })
    mockGetBackLink.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST_PAST, signedInAuthState, {
      ...defaultSearchState,
      nhsNumber: "1234567890"
    })

    await waitFor(() => {
      const backLink = screen.getByTestId("go-back-link")
      expect(backLink).toHaveAttribute(
        "href",
        FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER
      )
    })
  })

  it("renders the prescription not found message when prescriptionId query returns no results", async () => {
    const noResults: SearchResponse = {
      patient: mockSearchResponse.patient,
      patientFallback: false,
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
    mockGetBackLink.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)

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
    mockGetBackLink.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT,
      signedInAuthState,
      {
        ...defaultSearchState,
        nhsNumber: "32165649870"
      }
    )

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
      expect(screen.getByTestId("presc-not-found-heading")).toHaveTextContent(
        STRINGS.heading
      )
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
  it("renders correct message for a current prescription", async () => {
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

    const statusLabel = await screen.findByText("Available to download when due")
    expect(statusLabel).toBeInTheDocument()
  })
  it("renders correct message for a past prescription", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_PAST,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "C0C757-A83008-C2D93O"
      }
    )
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    const statusLabel = await screen.findByText("Not dispensed")
    expect(statusLabel).toBeInTheDocument()
  })
  it("renders correct message for a future prescription", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(
      FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE,
      signedInAuthState,
      {
        ...defaultSearchState,
        prescriptionId: "C0C757-A83008-C2D93O"
      }
    )
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    const statusLabel = await screen.findByText("To dispense in the future")
    expect(statusLabel).toBeInTheDocument()
  })
})
