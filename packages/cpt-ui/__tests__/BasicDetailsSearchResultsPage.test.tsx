import React from "react"
import {
  render,
  screen,
  fireEvent,
  waitFor
} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import BasicDetailsSearchResultsPage from "@/pages/BasicDetailsSearchResultsPage"
import {SearchResultsPageStrings} from "@/constants/ui-strings/BasicDetailsSearchResultsPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import http from "@/helpers/axios"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"

// Mock the axios module
jest.mock("@/helpers/axios")

const mockAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: true,
  isSigningIn: false,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: false,
  hasSingleRoleAccess: false,
  selectedRole: undefined,
  userDetails: undefined,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  updateSelectedRole: jest.fn()
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
const defaultSearchState: SearchProviderContextType = {
  prescriptionId: null,
  issueNumber: undefined,
  firstName: null,
  lastName: null,
  dobDay: null,
  dobMonth: null,
  dobYear: null,
  postcode: null,
  nhsNumber: null,
  clearSearchParameters: mockClearSearchParameters,
  setPrescriptionId: mockSetPrescriptionId,
  setIssueNumber: mockSetIssueNumber,
  setFirstName: mockSetFirstName,
  setLastName: mockSetLastName,
  setDobDay: mockSetDobDay,
  setDobMonth: mockSetDobMonth,
  setDobYear: mockSetDobYear,
  setPostcode: mockSetPostcode,
  setNhsNumber: mockSetNhsNumber
}

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}))

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

describe("BasicDetailsSearchResultsPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    // Mock successful API response
    ; (http.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: mockPatients
    })
  })

  it("shows loading state initially", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    expect(screen.getByText(SearchResultsPageStrings.LOADING)).toBeInTheDocument()
  })

  it("renders the page title and results count", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(SearchResultsPageStrings.TITLE)).toBeInTheDocument()
      expect(screen.getByText(SearchResultsPageStrings.RESULTS_COUNT.replace("{count}", "2"))).toBeInTheDocument()
    })
  })

  it("renders the table headers correctly", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

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
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

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
    (http.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: [mockPatients[0]]
    })
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
    })
  })

  it("navigates to prescription list when clicking a patient row", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")
      fireEvent.click(firstPatientRow!)

      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
    })
  })

  it("navigates to prescription list when clicking a patient name link", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      const patientNameLink = screen.getByText("Issac Wolderton-Rodriguez")
      fireEvent.click(patientNameLink)

      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
    })
  })

  it("navigates back when clicking the back link", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      const backLink = screen.getByText(SearchResultsPageStrings.GO_BACK)
      fireEvent.click(backLink)

      expect(mockNavigate).toHaveBeenCalledWith(
        `${FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS}`
      )
    })
  })

  it("handles keyboard navigation for patient rows", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")

      // Test Enter key
      fireEvent.keyDown(firstPatientRow!, {key: "Enter"})
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")

      // Reset mock
      mockNavigate.mockClear()

      // Test Space key
      fireEvent.keyDown(firstPatientRow!, {key: " "})
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetNhsNumber).toHaveBeenCalledWith("9726919207")
    })
  })

  it("formats NHS numbers correctly with spaces", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("972 691 9207")).toBeInTheDocument()
      expect(screen.getByText("972 591 9207")).toBeInTheDocument()
    })
  })

  it("provides correct accessibility implementation for table cells", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SearchContext.Provider value={defaultSearchState}>
            <BasicDetailsSearchResultsPage />
          </SearchContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    )

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
    (http.get as jest.Mock).mockRejectedValue(new Error("Something went wrong"))

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <BasicDetailsSearchResultsPage />
        </AuthContext.Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId("unknown-error-message")).toBeInTheDocument()
      expect(screen.getByTestId("unknown-error-heading"))
        .toHaveTextContent("Sorry, there is a problem with this service")
    })
  })
})
