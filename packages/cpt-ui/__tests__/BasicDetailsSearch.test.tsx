import "@testing-library/jest-dom"
import {render, screen, cleanup} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import {MemoryRouter, Routes, Route} from "react-router-dom"

import BasicDetailsSearch from "@/components/prescriptionSearch/BasicDetailsSearch"
import {STRINGS} from "@/constants/ui-strings/BasicDetailsSearchStrings"

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useNavigate: jest.fn()
  }
})

const renderComponent = () => {
  return render(
    <MemoryRouter initialEntries={["/search"]}>
      <Routes>
        <Route path="/search" element={<BasicDetailsSearch />} />
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

const assertInlineAndSummaryError = (message: string) => {
  expect(screen.getAllByText(message)).toHaveLength(2)
}

const assertErrorOccurrences = (message: string, expectedCount = 2) => {
  expect(screen.getAllByText(message)).toHaveLength(expectedCount)
}

describe("BasicDetailsSearch Validation", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows error if last name is missing", async () => {
    renderComponent()
    await fillForm({dobDay: "01", dobMonth: "01", dobYear: "2000"})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.lastNameRequired)
  })

  it("shows error for long first name", async () => {
    renderComponent()
    await fillForm({firstName: "A".repeat(36), lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000"})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.firstNameTooLong)
  })

  it("shows error for long last name", async () => {
    renderComponent()
    await fillForm({lastName: "B".repeat(36), dobDay: "01", dobMonth: "01", dobYear: "2000"})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.lastNameTooLong)
  })

  it("shows error for last name with invalid characters", async () => {
    renderComponent()
    await fillForm({lastName: "Sm!th", dobDay: "01", dobMonth: "01", dobYear: "2000"})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.lastNameInvalidChars)
  })

  it("shows error for empty DOB", async () => {
    renderComponent()
    await fillForm({lastName: "Smith"})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.dobRequired)
  })

  describe("Additional Partial and Invalid DOB scenarios", () => {
    const dobCases = [
      {
        input: {lastName: "Smith", dobDay: "ab", dobMonth: "ab", dobYear: ""},
        expectedError: STRINGS.errors.dobInvalidDate
      },
      {
        input: {lastName: "Smith", dobDay: "ab", dobMonth: "", dobYear: "ab"},
        expectedError: STRINGS.errors.dobInvalidDate
      },
      {
        input: {lastName: "Smith", dobDay: "", dobMonth: "ab", dobYear: "ab"},
        expectedError: STRINGS.errors.dobInvalidDate
      },
      {
        input: {lastName: "Smith", dobDay: "ab", dobMonth: "", dobYear: ""},
        expectedError: STRINGS.errors.dobInvalidDate
      },
      {
        input: {lastName: "Smith", dobDay: "", dobMonth: "ab", dobYear: ""},
        expectedError: STRINGS.errors.dobInvalidDate
      },
      {
        input: {lastName: "Smith", dobDay: "", dobMonth: "", dobYear: "ab"},
        expectedError: STRINGS.errors.dobInvalidDate
      },
      {
        input: {lastName: "Smith", dobDay: "ab", dobMonth: "ab", dobYear: "2020"},
        expectedError: STRINGS.errors.dobInvalidDate
      },
      {
        input: {lastName: "Smith", dobDay: "02", dobMonth: "13", dobYear: "2020"},
        expectedError: STRINGS.errors.dobInvalidDate
      },
      {
        input: {lastName: "Smith", dobDay: "02", dobMonth: "01", dobYear: "3000"},
        expectedError: STRINGS.errors.dobFutureDate
      },
      {
        input: {lastName: "Smith", dobDay: "", dobMonth: "01", dobYear: "2020"},
        expectedError: STRINGS.errors.dobDayRequired
      },
      {
        input: {lastName: "Smith", dobDay: "02", dobMonth: "", dobYear: "2020"},
        expectedError: STRINGS.errors.dobMonthRequired
      },
      {
        input: {lastName: "Smith", dobDay: "02", dobMonth: "01", dobYear: ""},
        expectedError: STRINGS.errors.dobYearRequired
      },
      {
        input: {lastName: "Smith", dobDay: "02", dobMonth: "01", dobYear: "abc"},
        expectedError: STRINGS.errors.dobNonNumericYear
      }
    ]

    it.each(dobCases)(
      "shows correct DOB error for %j",
      async ({input, expectedError}) => {
        renderComponent()
        await fillForm(input)
        await submitForm()
        assertErrorOccurrences(expectedError)
      }
    )
  })

  it("shows error for short year", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "80"})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.dobYearTooShort)
  })

  it("shows error for non-numeric DOB fields", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "aa", dobMonth: "bb", dobYear: "cc"})
    await submitForm()

    assertErrorOccurrences(STRINGS.errors.dobInvalidDate, 2)
  })

  it("shows error for DOB in the future", async () => {
    const nextYear = new Date().getFullYear() + 1
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: `${nextYear}`})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.dobFutureDate)
  })

  it("shows postcode too short error", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000", postcode: "LS1"})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.postcodeTooShort)
  })

  it("shows postcode invalid chars error", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: "2000", postcode: "!!!"})
    await submitForm()
    assertInlineAndSummaryError(STRINGS.errors.postcodeInvalidChars)
  })

  it("applies nhsuk-input--error only to invalid DOB fields for dobInvalidDate", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "ab", dobMonth: "", dobYear: "2014"})
    await submitForm()

    const dayInput = screen.getByTestId("dob-day-input")
    const monthInput = screen.getByTestId("dob-month-input")
    const yearInput = screen.getByTestId("dob-year-input")

    expect(dayInput).toHaveClass("nhsuk-input--error")
    expect(monthInput).toHaveClass("nhsuk-input--error")
    expect(yearInput).not.toHaveClass("nhsuk-input--error")
  })
})
