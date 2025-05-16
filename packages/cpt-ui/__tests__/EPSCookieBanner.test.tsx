import {render, screen, fireEvent} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import EPSCookieBanner from "@/components/EPSCookieBanner"

beforeEach(() => {
  localStorage.clear()
  window.NHSCookieConsent = {
    VERSION: "1.0.0",
    getPreferences: jest.fn(() => false),
    getStatistics: jest.fn(() => false),
    getMarketing: jest.fn(() => false),
    getConsented: jest.fn(() => false),
    setPreferences: jest.fn(),
    setStatistics: jest.fn(),
    setMarketing: jest.fn(),
    setConsented: jest.fn()
  }
})

afterEach(() => {
  jest.clearAllMocks()
})

describe("EPSCookieBanner", () => {
  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <EPSCookieBanner />
      </MemoryRouter>
    )
  }

  it("accepts cookies and calls NHSCookieConsent methods when clicked", () => {
    renderComponent()
    const acceptButton = screen.getByRole("button", {name: /accept analytics cookies/i})
    fireEvent.click(acceptButton)
    expect(window.NHSCookieConsent.setStatistics).toHaveBeenCalledWith(true)
    expect(window.NHSCookieConsent.setConsented).toHaveBeenCalledWith(true)
  })

  it("rejects cookies and disables statistics", () => {
    renderComponent()
    const rejectButton = screen.getByTestId("reject-button")
    fireEvent.click(rejectButton)
    expect(window.NHSCookieConsent.setStatistics).toHaveBeenCalledWith(false)
    expect(window.NHSCookieConsent.setConsented).toHaveBeenCalledWith(true)
  })

  it("does not render when on cookies page", () => {
    render(
      <MemoryRouter initialEntries={["/cookies"]}>
        <EPSCookieBanner />
      </MemoryRouter>
    )

    const cookieBanner = screen.queryByRole("banner", {name: /cookie banner/i})
    expect(cookieBanner).toBeNull()
  })
})
