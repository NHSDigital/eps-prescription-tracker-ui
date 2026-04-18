import React, {useMemo} from "react"
import {screen, render, waitFor} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import axios, {AxiosError, AxiosHeaders} from "axios"
import PrescriptionListPage from "@/pages/PrescriptionListPage"
import {SearchContext} from "@/context/SearchProvider"
import {AuthContext} from "@/context/AuthProvider"
import {NavigationProvider} from "@/context/NavigationProvider"
import {PatientDetailsContext} from "@/context/PatientDetailsProvider"
import {FRONTEND_PATHS, API_ENDPOINTS} from "@/constants/environment"
import {logger} from "@/helpers/logger"
import * as logoutHelpers from "@/helpers/logout"
import {SearchResponse, PrescriptionSummary, TreatmentType} from "@cpt-ui-common/common-types/src/prescriptionList"
import {mockAuthState, mockSearchState} from "./mocks/AuthStateMock"

// Mock axios completely
jest.mock("axios", () => ({
  ...jest.requireActual("axios"),
  isAxiosError: jest.fn()
}))

// Mock http helper
jest.mock("@/helpers/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {use: jest.fn()},
      response: {use: jest.fn()}
    }
  }
}))

// Mock AWS RUM
jest.mock("@/helpers/awsRum", () => ({
  awsRum: null,
  awsRumConfig: {}
}))

// Mock logger
jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

import http from "@/helpers/axios"

// Mock logout helpers
jest.mock("@/helpers/logout", () => ({
  handleSignoutEvent: jest.fn(),
  signOut: jest.fn()
}))

const mockedHttp = http as jest.Mocked<typeof http>
const mockedAxios = axios as jest.Mocked<typeof axios>

// Set up axios.isAxiosError to return true for AxiosError instances
mockedAxios.isAxiosError.mockImplementation((error) => error instanceof AxiosError)

// Mock usePageTitle
jest.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: jest.fn()
}))

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}))

// Mock navigation context
const mockGetOriginalSearchParameters = jest.fn()
const mockNavigationContext = {
  pushNavigation: jest.fn(),
  goBack: jest.fn(),
  getBackPath: jest.fn(),
  setOriginalSearchPage: jest.fn(),
  captureOriginalSearchParameters: jest.fn(),
  getOriginalSearchParameters: mockGetOriginalSearchParameters,
  getRelevantSearchParameters: jest.fn(),
  startNewNavigationSession: jest.fn()
}

jest.mock("@/context/NavigationProvider", () => ({
  ...jest.requireActual("@/context/NavigationProvider"),
  useNavigationContext: () => mockNavigationContext
}))

// Mock auth context
const mockAuth = {
  ...mockAuthState,
  user: "mock-user",
  isSignedIn: true,
  sessionId: "mock-session-id",
  deviceId: "mock-device-id"
}

// Mock components that are not under test
jest.mock("@/components/EpsSpinner", () => () => <div data-testid="spinner">Loading...</div>)
jest.mock("@/components/UnknownErrorMessage", () => () => <div data-testid="error-message">Error occurred</div>)
jest.mock("@/components/EpsBackLink", () => ({children, ...props}:
    {children: React.ReactNode} & Record<string, unknown>) => (
  <a {...props}>{children}</a>
))
jest.mock("@/components/prescriptionList/PrescriptionsListTab", () => (props: {
  currentPrescriptions: Array<PrescriptionSummary>
  futurePrescriptions: Array<PrescriptionSummary>
  pastPrescriptions: Array<PrescriptionSummary>
}) => (
  <div data-testid="prescription-tabs">
    {`${props.currentPrescriptions.length} current, ${props.futurePrescriptions.length} future,
    ${props.pastPrescriptions.length} past`}
  </div>
))

// Test data
const mockPrescription: PrescriptionSummary = {
  prescriptionId: "ABC123-A83008-C2D93O",
  isDeleted: false,
  statusCode: "0001",
  issueDate: "2024-01-15T10:30:00Z",
  prescriptionTreatmentType: TreatmentType.ACUTE,
  pendingCancellation: false
}

const mockSearchResponse: SearchResponse = {
  patient: {
    nhsNumber: "9735652587",
    givenName: ["John"],
    familyName: "Smith",
    dateOfBirth: "1990-01-01",
    address: ["123 Test Street", "Test Area", "Test City"],
    postcode: "TE1 1ST"
  },
  patientFallback: false,
  currentPrescriptions: [mockPrescription],
  pastPrescriptions: [
    {...mockPrescription, prescriptionId: "PAST1", statusCode: "0004"},
    {...mockPrescription, prescriptionId: "PAST2", statusCode: "0005"}
  ],
  futurePrescriptions: [
    {...mockPrescription, prescriptionId: "FUTURE1"}
  ]
}

interface SearchStateProps {
  prescriptionId?: string
  issueNumber?: string
  nhsNumber?: string
  firstName?: string
  lastName?: string
  dobDay?: string
  dobMonth?: string
  dobYear?: string
  postcode?: string
  searchType?: "nhs" | "prescriptionId" | "basicDetails"
}

const TestWrapper = ({
  children,
  searchState = {}
}: {
  children: React.ReactNode
  searchState?: Partial<SearchStateProps>
}) => {
  const defaultSearchState = useMemo(() => ({
    ...mockSearchState,
    ...searchState
  }), [searchState])

  const patientDetailsState = {
    patientDetails: undefined,
    patientFallback: false,
    setPatientDetails: jest.fn(),
    setPatientFallback: jest.fn(),
    clear: jest.fn()
  }

  const MockAuthProvider = ({
    children
  }: {
    children: React.ReactNode
  }) => {
    return (
      <AuthContext.Provider value={mockAuth}>{children}</AuthContext.Provider>
    )
  }

  return (
    <MemoryRouter initialEntries={[FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT]}>
      <MockAuthProvider>
        <SearchContext.Provider value={defaultSearchState}>
          <NavigationProvider>
            <PatientDetailsContext.Provider value={patientDetailsState}>
              {children}
            </PatientDetailsContext.Provider>
          </NavigationProvider>
        </SearchContext.Provider>
      </MockAuthProvider>
    </MemoryRouter>
  )
}

describe("PrescriptionListPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetOriginalSearchParameters.mockReturnValue(null)
  })

  describe("Loading State", () => {
    it("shows loading spinner initially", () => {
      const pendingPromise = new Promise<{status: number, data: SearchResponse}>(() => {})
      mockedHttp.get.mockReturnValue(pendingPromise)

      render(
        <TestWrapper searchState={{prescriptionId: "ABC123", searchType: "prescriptionId"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      expect(screen.getByTestId("spinner")).toBeInTheDocument()
      expect(screen.getByText("Loading search results")).toBeInTheDocument()
    })
  })

  describe("Search Parameter Logic", () => {
    it("uses original NHS number from navigation context when available", async () => {
      mockGetOriginalSearchParameters.mockReturnValue({
        nhsNumber: "9735652587"
      })

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: mockSearchResponse
      })

      render(
        <TestWrapper searchState={{searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockedHttp.get).toHaveBeenCalledWith(
          API_ENDPOINTS.PRESCRIPTION_LIST,
          {
            params: expect.objectContaining({
              toString: expect.any(Function)
            })
          }
        )
      })

      const callArgs = mockedHttp.get.mock.calls[0]
      const searchParams = callArgs[1]?.params
      expect(searchParams.get("nhsNumber")).toBe("9735652587")
      // Note: Sensitive data like NHS numbers should not be logged for security reasons
    })

    it("uses original prescription ID from navigation context when no other parameters", async () => {
      mockGetOriginalSearchParameters.mockReturnValue({
        prescriptionId: "ABC123-A83008-C2D93O"
      })

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: mockSearchResponse
      })

      render(
        <TestWrapper searchState={{searchType: "prescriptionId"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockedHttp.get).toHaveBeenCalled()
      })

      const callArgs = mockedHttp.get.mock.calls[0]
      const searchParams = callArgs[1]?.params
      expect(searchParams.get("prescriptionId")).toBe("ABC123-A83008-C2D93O")
      // Note: Sensitive data like prescription IDs should not be logged for security reasons
    })

    it("does not use prescriptionId from original search if basic details are present", async () => {
      mockGetOriginalSearchParameters.mockReturnValue({
        prescriptionId: "ABC123-A83008-C2D93O",
        firstName: "John",
        lastName: "Smith"
      })

      render(
        <TestWrapper searchState={{searchType: "basicDetails"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
      })
    })

    it("falls back to search context NHS number when no original parameters", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: mockSearchResponse
      })

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockedHttp.get).toHaveBeenCalled()
      })

      const callArgs = mockedHttp.get.mock.calls[0]
      const searchParams = callArgs[1]?.params
      expect(searchParams.get("nhsNumber")).toBe("9735652587")
    })

    it("falls back to search context prescription ID when no NHS number", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: mockSearchResponse
      })

      render(
        <TestWrapper searchState={{prescriptionId: "ABC123-A83008-C2D93O", searchType: "prescriptionId"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockedHttp.get).toHaveBeenCalled()
      })

      const callArgs = mockedHttp.get.mock.calls[0]
      const searchParams = callArgs[1]?.params
      expect(searchParams.get("prescriptionId")).toBe("ABC123-A83008-C2D93O")
    })

    it("redirects to prescription ID search when no valid search criteria", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      render(
        <TestWrapper>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
      })

      expect(logger.info).toHaveBeenCalledWith(
        "No search type available - redirecting to prescription ID search"
      )
    })

    it("handles issueNumber undefined properly in search context", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: mockSearchResponse
      })

      render(
        <TestWrapper searchState={{
          prescriptionId: "ABC123-A83008-C2D93O",
          issueNumber: undefined,
          searchType: "prescriptionId"
        }}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockedHttp.get).toHaveBeenCalled()
      })

      const callArgs = mockedHttp.get.mock.calls[0]
      const searchParams = callArgs[1]?.params
      expect(searchParams.get("prescriptionId")).toBe("ABC123-A83008-C2D93O")
      expect(searchParams.get("issueNumber")).toBeNull()
    })
  })

  describe("API Response Scenarios", () => {
    it("handles successful response and sets prescription data", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: mockSearchResponse
      })

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId("prescription-tabs")).toBeInTheDocument()
      })

      expect(screen.getByText("1 current, 1 future, 2 past")).toBeInTheDocument()
      expect(screen.getByText("We found 4 results")).toBeInTheDocument()
    })

    it("handles 404 response and navigates to no prescriptions found", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockResolvedValue({
        status: 404,
        data: {}
      })

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.NO_PRESCRIPTIONS_FOUND)
      })

      expect(logger.warn).toHaveBeenCalledWith("No search results were returned")
    })

    it("handles non-200 status codes as errors", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockResolvedValue({
        status: 500,
        data: {}
      })

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument()
      })

      expect(logger.error).toHaveBeenCalledWith(
        "Error during search",
        expect.any(Error)
      )
    })

    it("handles 401 response with restart login - InvalidSession", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      const axiosError = new AxiosError(
        "Unauthorized",
        "401",
        {headers: new AxiosHeaders()},
        {},
        {
          status: 401,
          statusText: "Unauthorized",
          data: {restartLogin: true, invalidSessionCause: "InvalidSession"},
          headers: new AxiosHeaders(),
          config: {headers: new AxiosHeaders()}
        }
      )
      mockedHttp.get.mockRejectedValue(axiosError)

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(logoutHelpers.handleSignoutEvent).toHaveBeenCalledWith(
          mockAuth,
          mockNavigate,
          "PrescriptionListPage",
          "InvalidSession"
        )
      })

      expect(logger.warn).toHaveBeenCalledWith(
        "prescriptionList triggered restart login due to:",
        "InvalidSession"
      )
    })

    it("handles 401 response with restart login - ConcurrentSession", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      const axiosError = new AxiosError(
        "Unauthorized",
        "401",
        {headers: new AxiosHeaders()},
        {},
        {
          status: 401,
          statusText: "Unauthorized",
          data: {restartLogin: true, invalidSessionCause: "ConcurrentSession"},
          headers: new AxiosHeaders(),
          config: {headers: new AxiosHeaders()}
        }
      )
      mockedHttp.get.mockRejectedValue(axiosError)

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(logoutHelpers.handleSignoutEvent).toHaveBeenCalledWith(
          mockAuth,
          mockNavigate,
          "PrescriptionListPage",
          "ConcurrentSession"
        )
      })

      expect(logger.warn).toHaveBeenCalledWith(
        "prescriptionList triggered restart login due to:",
        "ConcurrentSession"
      )
    })

    it("handles 401 response with restart login - Timeout", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      const axiosError = new AxiosError(
        "Unauthorized",
        "401",
        {headers: new AxiosHeaders()},
        {},
        {
          status: 401,
          statusText: "Unauthorized",
          data: {restartLogin: true, invalidSessionCause: "Timeout"},
          headers: new AxiosHeaders(),
          config: {headers: new AxiosHeaders()}
        }
      )
      mockedHttp.get.mockRejectedValue(axiosError)

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(logoutHelpers.handleSignoutEvent).toHaveBeenCalledWith(
          mockAuth,
          mockNavigate,
          "PrescriptionListPage",
          "Timeout"
        )
      })

      expect(logger.warn).toHaveBeenCalledWith(
        "prescriptionList triggered restart login due to:",
        "Timeout"
      )
    })

    it("handles 401 response with restart login - no invalidSessionCause", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      const axiosError = new AxiosError(
        "Unauthorized",
        "401",
        {headers: new AxiosHeaders()},
        {},
        {
          status: 401,
          statusText: "Unauthorized",
          data: {restartLogin: true},
          headers: new AxiosHeaders(),
          config: {headers: new AxiosHeaders()}
        }
      )
      mockedHttp.get.mockRejectedValue(axiosError)

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(logoutHelpers.handleSignoutEvent).toHaveBeenCalledWith(
          mockAuth,
          mockNavigate,
          "PrescriptionListPage",
          undefined
        )
      })

      expect(logger.warn).toHaveBeenCalledWith(
        "prescriptionList triggered restart login due to:",
        undefined
      )
    })

    it("handles 404 axios error and navigates to no prescriptions found", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      const axiosError = new AxiosError(
        "Not Found",
        "404",
        {headers: new AxiosHeaders()},
        {},
        {
          status: 404,
          statusText: "Not Found",
          data: {},
          headers: new AxiosHeaders(),
          config: {headers: new AxiosHeaders()}
        }
      )
      mockedHttp.get.mockRejectedValue(axiosError)

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.NO_PRESCRIPTIONS_FOUND)
      })

      expect(logger.warn).toHaveBeenCalledWith(
        "No search results were returned",
        axiosError
      )
    })

    it("handles other axios errors", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      const axiosError = new AxiosError(
        "Server Error",
        "500",
        {headers: new AxiosHeaders()},
        {},
        {
          status: 500,
          statusText: "Server Error",
          data: {},
          headers: new AxiosHeaders(),
          config: {headers: new AxiosHeaders()}
        }
      )
      mockedHttp.get.mockRejectedValue(axiosError)

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument()
      })

      expect(logger.error).toHaveBeenCalledWith("Error during search", axiosError)
    })

    it("handles generic errors", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      const genericError = new Error("Network error")
      mockedHttp.get.mockRejectedValue(genericError)

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument()
      })

      expect(logger.error).toHaveBeenCalledWith("Error during search", genericError)
    })

    it("handles empty prescription results and navigates to no prescriptions found", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      const emptyResponse: SearchResponse = {
        ...mockSearchResponse,
        currentPrescriptions: [],
        pastPrescriptions: [],
        futurePrescriptions: []
      }

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: emptyResponse
      })

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.NO_PRESCRIPTIONS_FOUND)
      })

      expect(logger.info).toHaveBeenCalledWith(
        "A patient was returned, but they do not have any prescriptions."
      )
    })
  })

  describe("Error State", () => {
    it("shows error message when error state is true", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockRejectedValue(new Error("Network error"))

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument()
      })
    })
  })

  describe("Data Processing", () => {
    it("calculates prescription count correctly", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: mockSearchResponse
      })

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        // 1 current + 1 future + 2 past = 4 total
        expect(screen.getByText("We found 4 results")).toBeInTheDocument()
      })
    })
  })

  describe("Logging", () => {
    it("logs response status", async () => {
      mockGetOriginalSearchParameters.mockReturnValue(null)

      mockedHttp.get.mockResolvedValue({
        status: 200,
        data: mockSearchResponse
      })

      render(
        <TestWrapper searchState={{nhsNumber: "9735652587", searchType: "nhs"}}>
          <PrescriptionListPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith("Response status", {status: 200})
      })
    })
  })
})
