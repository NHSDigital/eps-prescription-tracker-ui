import {render, screen, fireEvent} from "@testing-library/react"
import EPSCookieBanner from "@/components/EPSCookieBanner"

beforeEach(() => {
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

test("accepts cookies and calls NHSCookieConsent methods", () => {
  render(<EPSCookieBanner />)

  const acceptButton = screen.getByRole("button", {name: /accept analytics cookies/i})
  fireEvent.click(acceptButton)

  expect(window.NHSCookieConsent.setStatistics).toHaveBeenCalledWith(true)
  expect(window.NHSCookieConsent.setConsented).toHaveBeenCalledWith(true)
})

test("rejects cookies and disables statistics", () => {
  render(<EPSCookieBanner />)

  const rejectButton = screen.getByRole("button", {name: /reject analytics cookies/i})
  fireEvent.click(rejectButton)

  expect(window.NHSCookieConsent.setStatistics).toHaveBeenCalledWith(false)
  expect(window.NHSCookieConsent.setConsented).toHaveBeenCalledWith(true)
})
