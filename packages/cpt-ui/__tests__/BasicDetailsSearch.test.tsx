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

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useLocation: actual.useLocation,
    useNavigate: jest.fn()
  }
})

const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={["/search"]}>
      <Routes>
        <Route path="/search" element={ui} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>
  )
}

const fillForm = async ({
  firstName = "",
  lastName = "",
  dobDay = "",
  dobMonth = "",
  dobYear = "",
  postcode = ""
}) => {
  if (firstName) await userEvent.type(screen.getByTestId("first-name-input"), firstName)
  if (lastName) await userEvent.type(screen.getByTestId("last-name-input"), lastName)
  if (dobDay) await userEvent.type(screen.getByTestId("dob-day-input"), dobDay)
  if (dobMonth) await userEvent.type(screen.getByTestId("dob-month-input"), dobMonth)
  if (dobYear) await userEvent.type(screen.getByTestId("dob-year-input"), dobYear)
  if (postcode) await userEvent.type(screen.getByTestId("postcode-input"), postcode)
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

  it("redirects to the prescription list if only one patient is found from the basic details search", async () => {
    const mockNavigate = jest.fn()
      ; (useNavigate as jest.Mock).mockReturnValue(mockNavigate)

    renderWithRouter(<BasicDetailsSearch />)

    await fillForm({
      firstName: "James",
      lastName: "Smith",
      dobDay: "02",
      dobMonth: "04",
      dobYear: "2006",
      postcode: "LS1 1AB"
    })

    await submitForm()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=1234567890`
      )
    })
  })

  it("redirects to the too many results page if 11 or more results are returned", async () => {
    const mockNavigate = jest.fn()
      ; (useNavigate as jest.Mock).mockReturnValue(mockNavigate)

    renderWithRouter(<BasicDetailsSearch />)

    const formData = {
      firstName: "",
      lastName: "Jones",
      dobDay: "16",
      dobMonth: "07",
      dobYear: "1985",
      postcode: ""
    }

    await fillForm(formData)
    await submitForm()

    expect(mockNavigate).toHaveBeenCalledWith(
      FRONTEND_PATHS.SEARCH_RESULTS_TOO_MANY,
      {state: formData}
    )
  })

  it("redirects to the patient search results page if more than one but fewer than 11 patients are found", async () => {
    const mockNavigate = jest.fn()
      ; (useNavigate as jest.Mock).mockReturnValue(mockNavigate)

    renderWithRouter(<BasicDetailsSearch />)

    await fillForm({
      firstName: "",
      lastName: "Wolderton-Rodriguez",
      dobDay: "06",
      dobMonth: "05",
      dobYear: "2013",
      postcode: "LS6 1JL"
    })

    await submitForm()

    expect(mockNavigate).toHaveBeenCalledWith(
      FRONTEND_PATHS.PATIENT_SEARCH_RESULTS,
      {
        state: {
          patients: [
            {
              nhsNumber: "9726919207",
              given: "Issac",
              family: "Wolderton-Rodriguez",
              dateOfBirth: "06-05-2013",
              postcode: "LS6 1JL"
            },
            {
              nhsNumber: "9726919207",
              given: "Steve",
              family: "Wolderton-Rodriguez",
              dateOfBirth: "06-05-2013",
              postcode: "LS6 1JL"
            }
          ]
        }
      }
    )
  })

  const testCases = [
    {
      title: "shows error if last name is missing",
      input: {dobDay: "01", dobMonth: "01", dobYear: "2000"},
      expectedError: STRINGS.errors.lastNameRequired
    },
    {
      title: "shows error for long first name",
      input: {firstName: "A".repeat(36), lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000"},
      expectedError: STRINGS.errors.firstNameTooLong
    },
    {
      title: "shows error for long last name",
      input: {lastName: "B".repeat(36), dobDay: "01", dobMonth: "01", dobYear: "2000"},
      expectedError: STRINGS.errors.lastNameTooLong
    },
    {
      title: "shows error for last name with invalid characters",
      input: {lastName: "Sm!th", dobDay: "01", dobMonth: "01", dobYear: "2000"},
      expectedError: STRINGS.errors.lastNameInvalidChars
    },
    {
      title: "shows error for empty DOB",
      input: {lastName: "Smith"},
      expectedError: STRINGS.errors.dobRequired
    },
    {
      title: "shows error for short year",
      input: {lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "80"},
      expectedError: STRINGS.errors.dobYearTooShort
    },
    {
      title: "shows postcode too short error",
      input: {lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000", postcode: "LS1"},
      expectedError: STRINGS.errors.postcodeTooShort
    },
    {
      title: "shows postcode invalid chars error",
      input: {lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000", postcode: "!!!"},
      expectedError: STRINGS.errors.postcodeInvalidChars
    }
  ]

  testCases.forEach(({title, input, expectedError}) => {
    it(title, async () => {
      renderWithRouter(<BasicDetailsSearch />)
      await fillForm(input)
      await submitForm()
      expectInlineAndSummaryError(expectedError)
    })
  })

  describe("DOB validation scenarios", () => {
    const dobCases: Array<[BasicDetailsSearchType, string]> = [
      [{dobDay: "ab", dobMonth: "ab", dobYear: ""}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "ab", dobMonth: "", dobYear: "ab"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "", dobMonth: "ab", dobYear: "ab"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "ab", dobMonth: "", dobYear: ""}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "", dobMonth: "ab", dobYear: ""}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "", dobMonth: "", dobYear: "ab"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "ab", dobMonth: "ab", dobYear: "2020"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "02", dobMonth: "13", dobYear: "2020"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "72", dobMonth: "ab", dobYear: "2020"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "00", dobMonth: "00", dobYear: "0000"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "", dobMonth: "01", dobYear: "2020"}, STRINGS.errors.dobDayRequired],
      [{dobDay: "02", dobMonth: "", dobYear: "2020"}, STRINGS.errors.dobMonthRequired],
      [{dobDay: "02", dobMonth: "01", dobYear: ""}, STRINGS.errors.dobYearRequired],
      [{dobDay: "02", dobMonth: "01", dobYear: "abc"}, STRINGS.errors.dobNonNumericYear]
    ]

    it.each(dobCases)(
      "shows correct DOB error for %j",
      async (partialDob, expectedError) => {
        renderWithRouter(<BasicDetailsSearch />)
        await fillForm({lastName: "Smith", ...partialDob})
        await submitForm()
        expect(screen.getAllByText(expectedError)).toHaveLength(2)
      }
    )
  })

  it("shows error for DOB in the future", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: `${new Date().getFullYear() + 1}`})
    await submitForm()
    expectInlineAndSummaryError(STRINGS.errors.dobFutureDate)
  })

  it("applies error class only to invalid DOB fields", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith", dobDay: "ab", dobMonth: "", dobYear: "2014"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input", false)
  })

  it("applies error to all DOB fields if dobRequired", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
  })

  it("adds error to year when dobFutureDate", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: `${new Date().getFullYear() + 1}`})
    await submitForm()
    expectFieldHasErrorClass("dob-year-input")
  })

  it("focuses month field if it's invalid (e.g., 45)", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    const monthInput = screen.getByTestId("dob-month-input")
    await userEvent.click(screen.getAllByText(STRINGS.errors.dobInvalidDate).find(el => el.tagName === "A")!)
    expect(document.activeElement).toBe(monthInput)
  })

  it("adds error to day/month when both out of range", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith", dobDay: "79", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input", false)
  })

  it("focuses day input when dobInvalidDate is due to day and month", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith", dobDay: "79", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    const link = screen.getAllByText(STRINGS.errors.dobInvalidDate).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })

  it("adds error class to all DOB fields and focuses day if all invalid", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith", dobDay: "78", dobMonth: "75", dobYear: ""})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
    const link = screen.getAllByText(STRINGS.errors.dobInvalidDate).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })

  it("adds error class to all DOB fields and focuses day for all-zero DOB input", async () => {
    renderWithRouter(<BasicDetailsSearch />)
    await fillForm({lastName: "Smith", dobDay: "00", dobMonth: "00", dobYear: "0000"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
    const link = screen.getAllByText(STRINGS.errors.dobInvalidDate).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })
})
