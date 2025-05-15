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
  render(
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

describe("BasicDetailsSearch Validation", () => {
  beforeEach(() => jest.resetAllMocks())
  afterEach(() => cleanup())

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
      renderComponent()
      await fillForm(input)
      await submitForm()
      expectInlineAndSummaryError(expectedError)
    })
  })

  describe("DOB validation scenarios", () => {
    const dobCases = [
      [{dobDay: "ab", dobMonth: "ab", dobYear: ""}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "ab", dobMonth: "", dobYear: "ab"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "", dobMonth: "ab", dobYear: "ab"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "ab", dobMonth: "", dobYear: ""}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "", dobMonth: "ab", dobYear: ""}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "", dobMonth: "", dobYear: "ab"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "ab", dobMonth: "ab", dobYear: "2020"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "02", dobMonth: "13", dobYear: "2020"}, STRINGS.errors.dobInvalidDate],
      [{dobDay: "", dobMonth: "01", dobYear: "2020"}, STRINGS.errors.dobDayRequired],
      [{dobDay: "02", dobMonth: "", dobYear: "2020"}, STRINGS.errors.dobMonthRequired],
      [{dobDay: "02", dobMonth: "01", dobYear: ""}, STRINGS.errors.dobYearRequired],
      [{dobDay: "02", dobMonth: "01", dobYear: "abc"}, STRINGS.errors.dobNonNumericYear]
    ]

    it.each(dobCases)(
      "shows correct DOB error for %j",
      async (partialDob, expectedError) => {
        renderComponent()
        await fillForm({lastName: "Smith", ...partialDob})
        await submitForm()
        expect(screen.getAllByText(expectedError)).toHaveLength(2)
      }
    )
  })

  it("shows error for DOB in the future", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: `${new Date().getFullYear() + 1}`})
    await submitForm()
    expectInlineAndSummaryError(STRINGS.errors.dobFutureDate)
  })

  it("applies error class only to invalid DOB fields", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "ab", dobMonth: "", dobYear: "2014"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input", false)
  })

  it("applies error to all DOB fields if dobRequired", async () => {
    renderComponent()
    await fillForm({lastName: "Smith"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
  })

  it("adds error to year when dobFutureDate", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "01", dobYear: `${new Date().getFullYear() + 1}`})
    await submitForm()
    expectFieldHasErrorClass("dob-year-input")
  })

  it("focuses month field if it's invalid (e.g., 45)", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "01", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    const monthInput = screen.getByTestId("dob-month-input")
    await userEvent.click(screen.getAllByText(STRINGS.errors.dobInvalidDate).find(el => el.tagName === "A")!)
    expect(document.activeElement).toBe(monthInput)
  })

  it("adds error to day/month when both out of range", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "79", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input", false)
  })

  it("focuses day input when dobInvalidDate is due to day and month", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "79", dobMonth: "45", dobYear: "2014"})
    await submitForm()
    const link = screen.getAllByText(STRINGS.errors.dobInvalidDate).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })

  it("adds error class to all DOB fields and focuses day if all invalid", async () => {
    renderComponent()
    await fillForm({lastName: "Smith", dobDay: "78", dobMonth: "75", dobYear: ""})
    await submitForm()
    expectFieldHasErrorClass("dob-day-input")
    expectFieldHasErrorClass("dob-month-input")
    expectFieldHasErrorClass("dob-year-input")
    const link = screen.getAllByText(STRINGS.errors.dobInvalidDate).find(el => el.tagName === "A")!
    await userEvent.click(link)
    expect(document.activeElement).toBe(screen.getByTestId("dob-day-input"))
  })
})
