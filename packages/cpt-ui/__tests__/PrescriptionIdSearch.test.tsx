import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import {MemoryRouter} from "react-router-dom"

import PrescriptionIdSearch from "@/components/prescriptionSearch/PrescriptionIdSearch"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext} from "@/context/AuthProvider"
import type {AuthContextType} from "@/context/AuthProvider"

const mockAuthContext = {
  error: null,
  user: null,
  isSignedIn: true,
  idToken: "mock-id-token" as any,
  accessToken: "mock-access-token" as any,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn()
} as AuthContextType

// Wrap with context
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe("PrescriptionIdSearch", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("renders the label, hint, and submit button", () => {
    renderWithProviders(<PrescriptionIdSearch />)
    expect(screen.getByTestId("prescription-id-label")).toBeInTheDocument()
    expect(screen.getByTestId("prescription-id-hint")).toBeInTheDocument()
    expect(screen.getByTestId("prescription-id-submit")).toHaveTextContent(
      PRESCRIPTION_ID_SEARCH_STRINGS.buttonText
    )
  })

  it("shows error for empty input", async () => {
    renderWithProviders(<PrescriptionIdSearch />)
    await userEvent.click(screen.getByTestId("prescription-id-submit"))
    expect(await screen.findByTestId("error-summary")).toBeInTheDocument()
    expect(screen.getAllByText(/Enter a prescription ID number/i).length).toBeGreaterThan(0)
  })

  it("shows error for invalid length", async () => {
    renderWithProviders(<PrescriptionIdSearch />)
    await userEvent.type(screen.getByTestId("prescription-id-input"), "12345")
    await userEvent.click(screen.getByTestId("prescription-id-submit"))
    expect(screen.getAllByText(/must contain 18 characters/i).length).toBeGreaterThan(0)
  })

  it("shows error for invalid characters", async () => {
    renderWithProviders(<PrescriptionIdSearch />)

    const invalidChars = "1234567890ABCDEFG!" // 18 characters with illegal `!`
    await userEvent.type(screen.getByTestId("prescription-id-input"), invalidChars)
    await userEvent.click(screen.getByTestId("prescription-id-submit"))

    const errorSummary = await screen.findByTestId("error-summary")

    expect(errorSummary).toHaveTextContent(
      "The prescription ID number must contain only letters, numbers, dashes or the + character"
    )
  })

  it("shows 'not recognised' error if fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ok: false, status: 404})
    ) as jest.Mock

    renderWithProviders(<PrescriptionIdSearch />)
    await userEvent.type(screen.getByTestId("prescription-id-input"), "9D4C80A830085EA4D3")
    await userEvent.click(screen.getByTestId("prescription-id-submit"))

    expect(screen.getAllByText(/not recognised/i).length).toBeGreaterThan(0)
  })

  it("shows loading message while fetching", async () => {
    let resolveFetch: () => void = () => {}

    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = () => resolve({ok: true, json: () => Promise.resolve({data: "mock"})})
        })
    ) as jest.Mock

    renderWithProviders(<PrescriptionIdSearch />)
    await userEvent.type(screen.getByTestId("prescription-id-input"), "9D4C80A830085EA4D3")
    await userEvent.click(screen.getByTestId("prescription-id-submit"))

    expect(screen.getAllByText(/Loading search results/i).length).toBeGreaterThan(1)

    resolveFetch()
  })
})
