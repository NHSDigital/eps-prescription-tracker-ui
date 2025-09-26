import React from "react"
import {
  render,
  screen,
  fireEvent,
  waitFor
} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"
import BasicDetailsSearchResultsPage from "@/pages/BasicDetailsSearchResultsPage"
import {SearchResultsPageStrings} from "@/constants/ui-strings/BasicDetailsSearchResultsPageStrings"
import http from "@/helpers/axios"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {AxiosError, AxiosHeaders} from "axios"

// Mock the axios module
jest.mock("@/helpers/axios")
const mockAxiosGet = http.get as jest.MockedFunction<typeof http.get>

const mockAuthContext: AuthContextType = {
  authConfigured: true,
  error: null,
  user: null,
  isSignedIn: true,
  isSigningIn: false,
  invalidSessionCause: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: false,
  hasSingleRoleAccess: false,
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn()
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

const mockPatients = [
  {
    nhsNumber: "9726919207",
    givenName: ["Issac"],
    familyName: "Wolderton-Rodriguez",
    gender: "Male",
    dateOfBirth: "6-May-2013",
    address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire", "LS6 1JL"]
  },
  {
    nhsNumber: "9725919207",
    givenName: ["Steve"],
    familyName: "Wolderton-Rodriguez",
    gender: "Male",
    dateOfBirth: "6-May-2013",
    address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire", "LS6 1JL"]
  }
]

function renderWithRouter() {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <SearchContext.Provider value={defaultSearchState}>
        <MemoryRouter initialEntries={["/patient-search-results"]}>
          <Routes>
            <Route path="/patient-search-results" element={<BasicDetailsSearchResultsPage />} />
            <Route path="/login" element={<div data-testid="login-page-shown" />} />
            <Route path="/prescription-list-current" element={<div data-testid="prescription-list-shown" />} />
            <Route path="/search-by-basic-details" element={<div data-testid="search-page-shown" />} />
          </Routes>
        </MemoryRouter>
      </SearchContext.Provider>
    </AuthContext.Provider>
  )
}

describe("BasicDetailsSearchResultsPage", () => {
  beforeEach(() => {
    // Mock successful API response
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: mockPatients
    })
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
      expect(screen.getAllByText("6-May-2013")[0]).toBeInTheDocument()
      expect(screen.getAllByText("123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL")[0])
        .toBeInTheDocument()
      expect(screen.getByText("972 691 9207")).toBeInTheDocument()

      // Check second patient
      expect(screen.getByText("Steve Wolderton-Rodriguez")).toBeInTheDocument()
      expect(screen.getAllByText("Male")[1]).toBeInTheDocument()
      expect(screen.getAllByText("6-May-2013")[1]).toBeInTheDocument()
      expect(screen.getAllByText("123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL")[1])
        .toBeInTheDocument()
      expect(screen.getByText("972 591 9207")).toBeInTheDocument()
    })
  })

  it("navigates to prescription list when there is only one result", async () => {
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: [mockPatients[0]]
    })
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByTestId("prescription-list-shown")).toBeInTheDocument()
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
    })
  })

  it("navigates to prescription list when clicking a patient row", async () => {
    renderWithRouter()
    await waitFor(() => {
      const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")
      fireEvent.click(firstPatientRow!)

      expect(screen.getByTestId("prescription-list-shown")).toBeInTheDocument()
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
    })
  })

  it("navigates to prescription list when clicking a patient name link", async () => {
    renderWithRouter()

    await waitFor(() => {
      const patientNameLink = screen.getByText("Issac Wolderton-Rodriguez")
      fireEvent.click(patientNameLink)

      expect(screen.getByTestId("prescription-list-shown")).toBeInTheDocument()
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
    })
  })

  it("navigates back when clicking the back link", async () => {
    renderWithRouter()

    await waitFor(() => {
      const backLink = screen.getByText(SearchResultsPageStrings.GO_BACK)
      fireEvent.click(backLink)

      expect(screen.getByTestId("search-page-shown")).toBeInTheDocument()
    })
  })

  it("handles enter key navigation for patient rows", async () => {
    renderWithRouter()

    await waitFor(() => {
      const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")
      fireEvent.keyDown(firstPatientRow!, {key: "Enter"})

      expect(screen.getByTestId("prescription-list-shown")).toBeInTheDocument()
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
    })
  })

  it("handles space key navigation for patient rows", async () => {
    renderWithRouter()

    await waitFor(() => {
      const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")
      fireEvent.keyDown(firstPatientRow!, {key: " "})

      expect(screen.getByTestId("prescription-list-shown")).toBeInTheDocument()
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
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

      const dobCells = screen.getAllByText("6-May-2013")
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
})
