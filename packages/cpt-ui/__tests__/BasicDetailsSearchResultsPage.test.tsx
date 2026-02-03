import React from "react"
import {
  render,
  screen,
  fireEvent,
  waitFor
} from "@testing-library/react"
import {
  MemoryRouter,
  Routes,
  Route,
  useNavigate
} from "react-router-dom"
import BasicDetailsSearchResultsPage from "@/pages/BasicDetailsSearchResultsPage"
import {SearchResultsPageStrings} from "@/constants/ui-strings/BasicDetailsSearchResultsPageStrings"
import http from "@/helpers/axios"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"
import {AxiosError, AxiosHeaders} from "axios"
import {
  PatientAddressUse,
  PatientNameUse,
  PatientSummary,
  PatientSummaryGender
} from "@cpt-ui-common/common-types"
import {STRINGS} from "@/constants/ui-strings/PatientDetailsBannerStrings"

// Mock the axios module
jest.mock("@/helpers/axios")
const mockAxiosGet = http.get as jest.MockedFunction<typeof http.get>

const mockGetRelevantSearchParameters = jest.fn()
const mockGetBackPath = jest.fn()
const mockGoBack = jest.fn()
const mockNavigationContext = {
  pushNavigation: jest.fn(),
  goBack: mockGoBack,
  getBackPath: mockGetBackPath,
  clearNavigation: jest.fn(),
  getCurrentEntry: jest.fn(),
  getNavigationStack: jest.fn(),
  canGoBack: jest.fn(),
  setOriginalSearchPage: jest.fn(),
  getOriginalSearchPage: jest.fn(),
  captureOriginalSearchParameters: jest.fn(),
  getOriginalSearchParameters: jest.fn(),
  getRelevantSearchParameters: mockGetRelevantSearchParameters,
  startNewNavigationSession: jest.fn()
}

jest.mock("@/context/NavigationProvider", () => ({
  ...jest.requireActual("@/context/NavigationProvider"),
  useNavigationContext: () => mockNavigationContext
}))

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn()
}))

const mockAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: true,
  isSigningIn: false,
  invalidSessionCause: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  sessionId: undefined,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  isSigningOut: false,
  setIsSigningOut: jest.fn()
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
  setSearchType: jest.fn(),
  getAllSearchParameters: mockGetAllSearchParameters,
  setAllSearchParameters: mockSetAllSearchParameters
}

const mockPatients: Array<PatientSummary> = [
  {
    nhsNumber: "9726919207",
    givenName: ["Issac"],
    familyName: "Wolderton-Rodriguez",
    gender: PatientSummaryGender.MALE,
    dateOfBirth: "2013-05-06",
    address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire"],
    postcode: "LS6 1JL"
  },
  {
    nhsNumber: "9725919207",
    givenName: ["Steve"],
    familyName: "Wolderton-Rodriguez",
    gender: PatientSummaryGender.MALE,
    dateOfBirth: "2013-05-16",
    address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire"],
    postcode: "LS6 1JL"
  }
]

function renderWithRouter(initialEntries = ["/patient-search-results"]) {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <SearchContext.Provider value={defaultSearchState}>
        <MemoryRouter initialEntries={initialEntries}>
          <NavigationProvider>
            <Routes>
              <Route path="/patient-search-results" element={<BasicDetailsSearchResultsPage />} />
              <Route path="/too-many-search-results" element={<div data-testid="too-many-results-page-shown" />} />
              <Route path="/login" element={<div data-testid="login-page-shown" />} />
              <Route path="/prescription-list-current" element={<div data-testid="prescription-list-shown" />} />
              <Route path="/search-by-basic-details" element={<div data-testid="search-page-shown" />} />
              <Route path="/search-by-prescription-id" element={<div data-testid="search-page-shown" />} />
            </Routes>
          </NavigationProvider>
        </MemoryRouter>
      </SearchContext.Provider>
    </AuthContext.Provider>
  )
}

describe("BasicDetailsSearchResultsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful API response
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: mockPatients
    })

    mockGetRelevantSearchParameters.mockReturnValue({
      firstName: "John",
      lastName: "Doe",
      dobDay: "01",
      dobMonth: "01",
      dobYear: "1990",
      postcode: "SW1A 1AA"
    })

    mockGetBackPath.mockReturnValue("/search-by-basic-details")
  })

  it("shows loading state initially", () => {
    renderWithRouter()

    expect(screen.getByText(SearchResultsPageStrings.LOADING)).toBeInTheDocument()
  })

  it("handles expired session by redirecting to login page", async () => {
    const headers = new AxiosHeaders({})
    mockAxiosGet.mockRejectedValue(new AxiosError(undefined, undefined, undefined, undefined,
      {
        status: 401,
        statusText: "Unauthorized",
        headers,
        config: {headers},
        data: {message: "Session expired or invalid. Please log in again.", restartLogin: true}
      }
    ))

    renderWithRouter()

    await waitFor(() => {
      expect(mockAuthContext.cognitoSignOut).toHaveBeenCalled()
    })
  })

  it("renders the page title and results count", async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(SearchResultsPageStrings.TITLE)).toBeInTheDocument()
      expect(screen.getByText(SearchResultsPageStrings.RESULTS_COUNT.replace("{count}", "2"))).toBeInTheDocument()
    })
  })

  it("renders the table headers correctly", async () => {
    renderWithRouter()

    await waitFor(() => {
      const tableHeaders = screen.getAllByRole("columnheader")
      expect(tableHeaders).toHaveLength(5)
      expect(tableHeaders[0]).toHaveTextContent(SearchResultsPageStrings.TABLE.NAME)
      expect(tableHeaders[1]).toHaveTextContent(SearchResultsPageStrings.TABLE.GENDER)
      expect(tableHeaders[2]).toHaveTextContent(SearchResultsPageStrings.TABLE.DOB)
      expect(tableHeaders[3]).toHaveTextContent(SearchResultsPageStrings.TABLE.ADDRESS)
      expect(tableHeaders[4]).toHaveTextContent(SearchResultsPageStrings.TABLE.NHS_NUMBER)
    })
  })

  it("renders patient data correctly", async () => {
    renderWithRouter()

    await waitFor(() => {
      // Check first patient
      expect(screen.getByText("Issac Wolderton-Rodriguez")).toBeInTheDocument()
      expect(screen.getAllByText("Male")[0]).toBeInTheDocument()
      expect(screen.getAllByText("16 May 2013")[0]).toBeInTheDocument()
      expect(screen.getAllByText("123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL")[0])
        .toBeInTheDocument()
      expect(screen.getByText("972 691 9207")).toBeInTheDocument()

      // Check second patient
      expect(screen.getByText("Steve Wolderton-Rodriguez")).toBeInTheDocument()
      expect(screen.getAllByText("Male")[1]).toBeInTheDocument()
      expect(screen.getAllByText("6 May 2013")[0]).toBeInTheDocument()
      expect(screen.getAllByText("123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL")[1])
        .toBeInTheDocument()
      expect(screen.getByText("972 591 9207")).toBeInTheDocument()
    })
  })

  it("renders patient data correctly when values are temporary", async () => {
    const mockTempPatients: Array<PatientSummary> = [
      {
        nhsNumber: "9726919207",
        givenName: ["Issac"],
        familyName: "Wolderton-Rodriguez",
        gender: PatientSummaryGender.MALE,
        nameUse: PatientNameUse.TEMP,
        dateOfBirth: "2013-05-06",
        address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire"],
        postcode: "LS6 1JL"
      },
      {
        nhsNumber: "9725919207",
        givenName: ["Steve"],
        familyName: "Wolderton-Rodriguez",
        gender: PatientSummaryGender.MALE,
        dateOfBirth: "2013-05-16",
        address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire"],
        postcode: "LS6 1JL",
        addressUse: PatientAddressUse.TEMP
      }
    ]

    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: mockTempPatients})

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(`Issac Wolderton-Rodriguez${STRINGS.TEMPORARY}`)).toBeInTheDocument()
      expect(screen.getByText(`123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL${STRINGS.TEMPORARY}`)
      ).toBeInTheDocument()
    })
  })

  it("renders patient data correctly when partial values are returned", async () => {
    const mockPartialPatients: Array<PatientSummary> = [
      {
        nhsNumber: "9726919207",
        givenName: ["Issac"],
        familyName: "n/a",
        gender: PatientSummaryGender.MALE,
        dateOfBirth: "2013-05-06",
        address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire"],
        postcode: "LS6 1JL"
      },
      {
        nhsNumber: "9725919207",
        givenName: "n/a",
        familyName: "Wolderton-Rodriguez",
        gender: PatientSummaryGender.MALE,
        dateOfBirth: "2013-05-16",
        address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire"],
        postcode: "LS6 1JL"
      },
      {
        nhsNumber: "9726919207",
        givenName: ["Issac"],
        familyName: "Wolderton-Rodriguez",
        gender: PatientSummaryGender.MALE,
        dateOfBirth: "2013-05-06",
        address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire"],
        postcode: "n/a"
      },
      {
        nhsNumber: "9725919207",
        givenName: ["Steve"],
        familyName: "Wolderton-Rodriguez",
        gender: PatientSummaryGender.MALE,
        dateOfBirth: "2013-05-16",
        address: "n/a",
        postcode: "LS6 1JL"
      }
    ]

    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: mockPartialPatients})

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getAllByText(STRINGS.NOT_ON_RECORD)[0]).toBeInTheDocument()
      expect(screen.getAllByText(STRINGS.NOT_ON_RECORD)[1]).toBeInTheDocument()
      expect(screen.getByText("123 Brundel Close, Headingley, Leeds, West Yorkshire")).toBeInTheDocument()
      expect(screen.getByText("LS6 1JL")).toBeInTheDocument()
    })
  })

  it("renders not available content for fields when pds record has missing data", async () => {
    const mockNAPatients: Array<PatientSummary> = [
      {
        nhsNumber: "9726919207",
        givenName: ["Issac"],
        familyName: "Wolderton-Rodriguez",
        gender: PatientSummaryGender.MALE,
        dateOfBirth: "2013-05-06",
        address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire"],
        postcode: "LS6 1JL"
      },
      {
        nhsNumber: "9725919207",
        givenName: "n/a",
        familyName: "n/a",
        gender: "n/a",
        dateOfBirth: "n/a",
        address: "n/a",
        postcode: "n/a"
      }
    ]

    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: mockNAPatients})

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getAllByText(STRINGS.NOT_ON_RECORD)).toHaveLength(4)
    })
  })

  it("navigates to prescription list when there is only one result", async () => {
    const mockNavigate = jest.fn()
    jest.mocked(useNavigate).mockReturnValue(mockNavigate)

    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: [mockPatients[0]]
    })
    renderWithRouter()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/prescription-list-current")
      expect(mockGetRelevantSearchParameters).toHaveBeenCalledWith(
        "basicDetails"
      )
      expect(mockSetAllSearchParameters).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        dobDay: "01",
        dobMonth: "01",
        dobYear: "1990",
        postcode: "SW1A 1AA",
        nhsNumber: "9726919207"
      })
    })
  })

  it("navigates to prescription list when clicking a patient row", async () => {
    const mockNavigate = jest.fn()
    jest.mocked(useNavigate).mockReturnValue(mockNavigate)

    renderWithRouter()
    await waitFor(() => {
      const firstPatientRow = screen
        .getByText("Issac Wolderton-Rodriguez")
        .closest("tr")
      fireEvent.click(firstPatientRow!)

      expect(mockNavigate).toHaveBeenCalledWith("/prescription-list-current")
      expect(mockGetRelevantSearchParameters).toHaveBeenCalledWith(
        "basicDetails"
      )
      expect(mockSetAllSearchParameters).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        dobDay: "01",
        dobMonth: "01",
        dobYear: "1990",
        postcode: "SW1A 1AA",
        nhsNumber: "9726919207"
      })
    })
  })

  it("navigates to prescription list when clicking a patient name link", async () => {
    const mockNavigate = jest.fn()
    jest.mocked(useNavigate).mockReturnValue(mockNavigate)

    renderWithRouter()

    await waitFor(() => {
      const patientNameLink = screen.getByText("Issac Wolderton-Rodriguez")
      fireEvent.click(patientNameLink)

      expect(mockNavigate).toHaveBeenCalledWith("/prescription-list-current")
      expect(mockGetRelevantSearchParameters).toHaveBeenCalledWith(
        "basicDetails"
      )
      expect(mockSetAllSearchParameters).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        dobDay: "01",
        dobMonth: "01",
        dobYear: "1990",
        postcode: "SW1A 1AA",
        nhsNumber: "9726919207"
      })
    })
  })

  it("navigates back when clicking the back link", async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByText(SearchResultsPageStrings.GO_BACK)
      ).toBeInTheDocument()
    })

    const backLink = screen.getByText(SearchResultsPageStrings.GO_BACK)
    fireEvent.click(backLink)

    expect(mockGoBack).toHaveBeenCalled()
    expect(mockGetBackPath).toHaveBeenCalled()
  })

  it("handles enter key navigation for patient rows", async () => {
    const mockNavigate = jest.fn()
    jest.mocked(useNavigate).mockReturnValue(mockNavigate)

    renderWithRouter()

    await waitFor(() => {
      const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")
      fireEvent.keyDown(firstPatientRow!, {key: "Enter"})

      expect(mockNavigate).toHaveBeenCalledWith("/prescription-list-current")
      expect(mockGetRelevantSearchParameters).toHaveBeenCalledWith(
        "basicDetails"
      )
      expect(mockSetAllSearchParameters).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        dobDay: "01",
        dobMonth: "01",
        dobYear: "1990",
        postcode: "SW1A 1AA",
        nhsNumber: "9726919207"
      })
    })
  })

  it("handles space key navigation for patient rows", async () => {
    const mockNavigate = jest.fn()
    jest.mocked(useNavigate).mockReturnValue(mockNavigate)

    renderWithRouter()

    await waitFor(() => {
      const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")
      fireEvent.keyDown(firstPatientRow!, {key: " "})

      expect(mockNavigate).toHaveBeenCalledWith("/prescription-list-current")
      expect(mockGetRelevantSearchParameters).toHaveBeenCalledWith(
        "basicDetails"
      )
      expect(mockSetAllSearchParameters).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        dobDay: "01",
        dobMonth: "01",
        dobYear: "1990",
        postcode: "SW1A 1AA",
        nhsNumber: "9726919207"
      })
    })
  })

  it("formats NHS numbers correctly with spaces", async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("972 691 9207")).toBeInTheDocument()
      expect(screen.getByText("972 591 9207")).toBeInTheDocument()
    })
  })

  it("provides correct accessibility implementation for table cells", async () => {
    renderWithRouter()

    await waitFor(() => {
      // Check that table cells have the correct headers attribute
      const nameCell = screen.getByText("Issac Wolderton-Rodriguez").closest("td")
      expect(nameCell).toHaveAttribute("headers", "header-name")

      const genderCells = screen.getAllByText("Male")
      expect(genderCells[0].closest("td")).toHaveAttribute("headers", "header-gender")

      const dobCells = screen.getAllByText("6 May 2013")
      expect(dobCells[0].closest("td")).toHaveAttribute("headers", "header-dob")

      const addressCells = screen.getAllByText("123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL")
      expect(addressCells[0].closest("td")).toHaveAttribute("headers", "header-address")

      const nhsCells = screen.getAllByText("972 691 9207")
      expect(nhsCells[0].closest("td")).toHaveAttribute("headers", "header-nhs")

      // Check that visually hidden text is present for screen readers
      const visuallyHiddenNhs = screen.getByText("NHS number 972 691 9207")
      expect(visuallyHiddenNhs).toHaveClass("nhsuk-u-visually-hidden")
    })
  })

  it("renders the unknown error message when the API call fails", async () => {
    mockAxiosGet.mockRejectedValue(new Error("Something went wrong"))

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByTestId("unknown-error-message")).toBeInTheDocument()
      expect(screen.getByTestId("unknown-error-heading"))
        .toHaveTextContent("Sorry, there is a problem with this service")
    })
  })

  it("navigates to too many search results page when more than 10 patients are returned", async () => {
    const mockNavigate = jest.fn()
    jest.mocked(useNavigate).mockReturnValue(mockNavigate)

    // Create a list of 11 patients to trigger the "too many" logic
    const manyPatients = Array.from({length: 11}, (_, i) => ({
      nhsNumber: `972691920${i}`,
      givenName: [`Patient${i}`],
      familyName: `TestPatient${i}`,
      gender: PatientSummaryGender.MALE,
      dateOfBirth: "2013-05-06",
      address: [`${i} Test Street`, "Leeds", "West Yorkshire"],
      postcode: "LS6 1JL"
    }))

    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: manyPatients
    })

    renderWithRouter(["/patient-search-results?firstName=Test"])

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/too-many-search-results?firstName=Test")
    })
  })
})
