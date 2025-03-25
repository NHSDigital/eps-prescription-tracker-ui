import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import {MemoryRouter, Routes, Route, useLocation} from "react-router-dom"

import PrescriptionIdSearch from "@/components/prescriptionSearch/PrescriptionIdSearch"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext} from "@/context/AuthProvider"
import {AuthContextType} from "@/context/AuthProvider"


const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname}</div>
}

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={["/search"]}>
      <AuthContext.Provider value={mockAuthContext}>
        <Routes>
          <Route path="/search" element={ui} />
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

const mockAuthContext = {
  error: null,
  user: null,
  isSignedIn: true,
  idToken: "mock-id-token" as any,
  accessToken: "mock-access-token" as any,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn()
} as AuthContextType

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
    expect(screen.getByTestId("find-prescription-button")).toHaveTextContent(
      PRESCRIPTION_ID_SEARCH_STRINGS.buttonText
    )
  })

  it("shows error for empty input", async () => {
    renderWithProviders(<PrescriptionIdSearch />)
    await userEvent.click(screen.getByTestId("find-prescription-button"))
    expect(await screen.findByTestId("error-summary")).toBeInTheDocument()
    expect(screen.getAllByText(/Enter a prescription ID number/i).length).toBeGreaterThan(0)
  })

  it("shows error for invalid length", async () => {
    renderWithProviders(<PrescriptionIdSearch />)
    await userEvent.type(screen.getByTestId("prescription-id-input"), "12345")
    await userEvent.click(screen.getByTestId("find-prescription-button"))
    expect(screen.getAllByText(/must contain 18 characters/i).length).toBeGreaterThan(0)
  })

  it("shows error for invalid characters", async () => {
    renderWithProviders(<PrescriptionIdSearch />)

    const invalidChars = "1234567890ABCDEFG!" // 18 characters with illegal `!`
    await userEvent.type(screen.getByTestId("prescription-id-input"), invalidChars)
    await userEvent.click(screen.getByTestId("find-prescription-button"))

    const errorSummary = await screen.findByTestId("error-summary")

    expect(errorSummary).toHaveTextContent(
      "The prescription ID number must contain only letters, numbers, dashes or the + character"
    )
  })

  it("redirects to 'not found' page if fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ok: false, status: 404})
    ) as jest.Mock

    renderWithRouter(<PrescriptionIdSearch />)

    await userEvent.type(screen.getByTestId("prescription-id-input"), "9D4C80A830085EA4D3")
    await userEvent.click(screen.getByTestId("find-prescription-button"))

    const location = await screen.findByTestId("location-display")
    expect(location).toHaveTextContent("/prescription-not-found")
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
    await userEvent.click(screen.getByTestId("find-prescription-button"))

    expect(screen.getAllByText(/Loading search results/i).length).toBeGreaterThan(1)

    resolveFetch()
  })

  it("redirects to prescription results if valid ID is entered", async () => {
    renderWithRouter(<PrescriptionIdSearch />)

    await userEvent.type(screen.getByTestId("prescription-id-input"), "C0C757A83008C2D93O")
    await userEvent.click(screen.getByTestId("find-prescription-button"))

    const location = await screen.findByTestId("location-display")
    expect(location).toHaveTextContent("/prescription-results")
  })
})
