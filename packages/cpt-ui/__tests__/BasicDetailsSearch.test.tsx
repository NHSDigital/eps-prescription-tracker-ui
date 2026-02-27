import "@testing-library/jest-dom"
import {
  render,
  screen,
  cleanup,
  waitFor
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  Routes,
  Route
} from "react-router-dom"

import BasicDetailsSearch from "@/components/prescriptionSearch/BasicDetailsSearch"
import {BasicDetailsSearchType} from "@cpt-ui-common/common-types"
import {STRINGS} from "@/constants/ui-strings/BasicDetailsSearchStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"
import {mockAuthState} from "./mocks/AuthStateMock"

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useLocation: actual.useLocation,
    useNavigate: jest.fn()
  }
})

// Mock auth context
const mockCognitoSignIn = jest.fn()
const mockCognitoSignOut = jest.fn()
const mockClearAuthState = jest.fn()

const signedInAuthState: AuthContextType = {
  ...mockAuthState,
  isSignedIn: true,
  isSigningIn: false,
  invalidSessionCause: undefined,
  user: "testUser",
  error: null,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  sessionId: "test-session-id",
  remainingSessionTime: undefined,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut,
  clearAuthState: mockClearAuthState,
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

const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

const renderWithRouter = (ui: React.ReactElement, searchState: SearchProviderContextType) => {
  return render(
    <AuthContext.Provider value={signedInAuthState}>
      <SearchContext.Provider value={searchState}>
        <MemoryRouter initialEntries={["/search"]}>
          <NavigationProvider>
            <Routes>
              <Route path="/search" element={ui} />
              <Route path="*" element={<LocationDisplay />} />
            </Routes>
          </NavigationProvider>
        </MemoryRouter>
      </SearchContext.Provider>
    </AuthContext.Provider>
  )
}

const fieldTestIds = {
  firstName: "first-name-input",
  lastName: "last-name-input",
  dobDay: "dob-day-input",
  dobMonth: "dob-month-input",
  dobYear: "dob-year-input",
  postcode: "postcode-input"
} as const

type FieldKey = keyof typeof fieldTestIds
type FillFormData = Partial<Record<FieldKey, string>>

export async function fillForm(data: FillFormData = {}) {
  for (const [key, value] of Object.entries(data) as Array<[FieldKey, string]>) {
    if (value === undefined) continue
    const testId = fieldTestIds[key]
    const input = screen.getByTestId(testId)

    // Clear the field first, then type the new value
    await userEvent.clear(input)
    if (value !== "") {
      await userEvent.type(input, value)
    }
  }
}

const submitForm = async () => {
  await userEvent.click(screen.getByTestId("find-patient-button"))
}

const expectInlineAndSummaryError = (message: string) => {
  expect(screen.getAllByText(message)).toHaveLength(2)
}

const expectFieldHasErrorClass = (testId: string, hasError = true) => {
  const el = screen.getByTestId(testId)
  if (hasError) {
    expect(el).toHaveClass("nhsuk-input--error")
  } else {
    expect(el).not.toHaveClass("nhsuk-input--error")
  }
}

describe("BasicDetailsSearch", () => {
  beforeEach(() => jest.resetAllMocks())
  afterEach(() => cleanup())

  it("redirects to the patient search results page", async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate)

    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)

    const formData = {
      firstName: "",
      lastName: "Wolderton-Rodriguez",
      dobDay: "06",
      dobMonth: "05",
      dobYear: "2013",
      postcode: "LS6 1JL"
    }

    await fillForm(formData)
    await submitForm()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PATIENT_SEARCH_RESULTS)
      expect(mockClearSearchParameters).toHaveBeenCalled()
      expect(mockSetFirstName).toHaveBeenCalledWith(formData.firstName)
      expect(mockSetLastName).toHaveBeenCalledWith(formData.lastName)
      expect(mockSetDobDay).toHaveBeenCalledWith(formData.dobDay)
      expect(mockSetDobMonth).toHaveBeenCalledWith(formData.dobMonth)
      expect(mockSetDobYear).toHaveBeenCalledWith(formData.dobYear)
      expect(mockSetPostcode).toHaveBeenCalledWith(formData.postcode)
    })
  })

  const testCases = [
    {
      title: "shows error if last name is missing",
      input: {dobDay: "01", dobMonth: "01", dobYear: "2000"},
      expectedError: STRINGS.ERRORS.LAST_NAME_REQUIRED
    },
    {
      title: "shows error for long first name",
      input: {firstName: "A".repeat(36), lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000"},
      expectedError: STRINGS.ERRORS.FIRST_NAME_TOO_LONG
    },
    {
      title: "shows error for long last name",
      input: {lastName: "B".repeat(36), dobDay: "01", dobMonth: "01", dobYear: "2000"},
      expectedError: STRINGS.ERRORS.LAST_NAME_TOO_LONG
    },
    {
      title: "shows error for last name with invalid characters",
      input: {lastName: "Sm!th", dobDay: "01", dobMonth: "01", dobYear: "2000"},
      expectedError: STRINGS.ERRORS.LAST_NAME_INVALID_CHARS
    },
    {
      title: "shows error for empty DOB",
      input: {lastName: "Smith"},
      expectedError: STRINGS.ERRORS.DOB_REQUIRED
    },
    {
      title: "shows error for short year",
      input: {lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "80"},
      expectedError: STRINGS.ERRORS.DOB_YEAR_TOO_SHORT
    },
    {
      title: "shows postcode too short error",
      input: {lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000", postcode: "LS1"},
      expectedError: STRINGS.ERRORS.POSTCODE_TOO_SHORT
    },
    {
      title: "shows postcode invalid chars error",
      input: {lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000", postcode: "!!!"},
      expectedError: STRINGS.ERRORS.POSTCODE_INVALID_CHARS
    }
  ]

  testCases.forEach(({title, input, expectedError}) => {
    it(title, async () => {
      renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
      await fillForm(input)
      await submitForm()
      expectInlineAndSummaryError(expectedError)
    })
  })

  describe("DOB validation scenarios", () => {
    const dobCases: Array<[BasicDetailsSearchType, string]> = [
      [{dobDay: "ab", dobMonth: "ab", dobYear: ""}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "ab", dobMonth: "", dobYear: "ab"}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "", dobMonth: "ab", dobYear: "ab"}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "ab", dobMonth: "", dobYear: ""}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "", dobMonth: "ab", dobYear: ""}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "", dobMonth: "", dobYear: "ab"}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "ab", dobMonth: "ab", dobYear: "2020"}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "02", dobMonth: "13", dobYear: "2020"}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "72", dobMonth: "ab", dobYear: "2020"}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "00", dobMonth: "00", dobYear: "0000"}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "17", dobMonth: "05", dobYear: "0000000"}, STRINGS.ERRORS.DOB_INVALID_DATE],
      [{dobDay: "", dobMonth: "01", dobYear: "2020"}, STRINGS.ERRORS.DOB_DAY_REQUIRED],
      [{dobDay: "02", dobMonth: "", dobYear: "2020"}, STRINGS.ERRORS.DOB_MONTH_REQUIRED],
      [{dobDay: "02", dobMonth: "01", dobYear: ""}, STRINGS.ERRORS.DOB_YEAR_REQUIRED],
      [{dobDay: "02", dobMonth: "01", dobYear: "abc"}, STRINGS.ERRORS.DOB_NON_NUMERIC_YEAR]
    ]

    it.each(dobCases)(
      "shows correct DOB error for %j",
      async (partialDob, expectedError) => {
        renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
        await fillForm({lastName: "Smith", ...partialDob})
        await submitForm()
        expect(screen.getAllByText(expectedError)).toHaveLength(2)
      }
    )

    it("accepts valid DOB when day and month are single digits (e.g., 1-1-2000", async () => {
      const mockNavigate = jest.fn()
    ;(useNavigate as jest.Mock).mockReturnValue(mockNavigate)

      renderWithRouter(<BasicDetailsSearch />, defaultSearchState)

      await fillForm({
        lastName: "Keary",
        dobDay: "1",
        dobMonth: "1",
        dobYear: "2012",
        postcode: "LS6 1JL"
      })
      await submitForm()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PATIENT_SEARCH_RESULTS)
      })
    })
  })

  it("shows error for DOB in the future", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: `${new Date().getFullYear() + 1}`})
    await submitForm()
    expectInlineAndSummaryError(STRINGS.ERRORS.DOB_FUTURE_DATE)
  })

  it("applies error class only to invalid DOB fields", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "ab", dobMonth: "", dobYear: "2014"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input", false)
  })

  it("applies error to all DOB fields if dobRequired", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
  })

  it("adds error to year when dobFutureDate", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: `${new Date().getFullYear() + 1}`})
    await submitForm()
    expectFieldHasErrorClass("dob-year-input")
  })

  it("focuses month field if it's invalid (e.g., 45)", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    const monthInput = screen.getByTestId("dob-month-input")
    await userEvent.click(screen.getAllByText(STRINGS.ERRORS.DOB_INVALID_DATE).find(el => el.tagName === "A")!)
    expect(document.activeElement).toBe(monthInput)
  })

  it("adds error to day/month when both out of range", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "79", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input", false)
  })

  it("focuses day input when dobInvalidDate is due to day and month", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "79", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    const link = screen.getAllByText(STRINGS.ERRORS.DOB_INVALID_DATE).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })

  it("adds error class to all DOB fields and focuses day if all invalid", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "78", dobMonth: "75", dobYear: ""})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
    const link = screen.getAllByText(STRINGS.ERRORS.DOB_INVALID_DATE).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })

  it("adds error class to all DOB fields and focuses day for all-zero DOB input", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "00", dobMonth: "00", dobYear: "0000"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
    const link = screen.getAllByText(STRINGS.ERRORS.DOB_INVALID_DATE).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })

  it("adds error class to all DOB fields and focuses day for invalid calendar dates", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)
    await fillForm({lastName: "Smith", dobDay: "31", dobMonth: "11", dobYear: "2015"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
    const link = screen.getAllByText(STRINGS.ERRORS.DOB_INVALID_DATE).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })

  it("keeps all DOB fields with error class after correction until resubmission", async () => {
    renderWithRouter(<BasicDetailsSearch />, defaultSearchState)

    // Step 1: submit invalid input
    await fillForm({lastName: "Smith", dobDay: "!", dobMonth: "!", dobYear: "!"})
    await submitForm()

    // Step 2: all DOB fields should show error
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")

    // Step 3: correct all fields (simulate user editing without submitting again)
    await userEvent.clear(screen.getByTestId("dob-day-input"))
    await userEvent.type(screen.getByTestId("dob-day-input"), "25")

    await userEvent.clear(screen.getByTestId("dob-month-input"))
    await userEvent.type(screen.getByTestId("dob-month-input"), "12")

    await userEvent.clear(screen.getByTestId("dob-year-input"))
    await userEvent.type(screen.getByTestId("dob-year-input"), "2010")

    // Step 4: error class should still be present until resubmission
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
  })
})
