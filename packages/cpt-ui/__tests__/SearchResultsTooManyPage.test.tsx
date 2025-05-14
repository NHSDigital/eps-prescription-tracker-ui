import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"
import React from "react"

import SearchResultsTooManyPage from "@/pages/SearchResultsTooManyPage"
import {STRINGS} from "@/constants/ui-strings/SearchResultsTooManyStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

const renderWithRouter = (state: Record<string, unknown> = {}) => {
  return render(
    <MemoryRouter initialEntries={[{pathname: "/search-too-many", state}]}>
      <Routes>
        <Route path="/search-too-many" element={<SearchResultsTooManyPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("SearchResultsTooManyPage", () => {
  it("renders heading, intro, and retry message", () => {
    renderWithRouter({firstName: "Alex", lastName: "Johnson", dob: "10-02-2010", postcode: "AB1 2CD"})

    expect(screen.getByTestId("too-many-results-page")).toBeInTheDocument()
    expect(screen.getByTestId("too-many-results-heading")).toHaveTextContent(STRINGS.heading)
    expect(screen.getByTestId("too-many-results-count-text")).toHaveTextContent(STRINGS.retryMessage)
    expect(screen.getByTestId("too-many-results-alt-options")).toHaveTextContent(STRINGS.alternativeSearch)
  })

  it("renders details list with all fields when available", () => {
    renderWithRouter({firstName: "Jane", lastName: "Doe", dob: "01-01-2000", postcode: "XY9 8ZZ"})

    const list = screen.getByTestId("too-many-results-details-list")
    expect(list).toHaveTextContent("First name: Jane")
    expect(list).toHaveTextContent("Last name: Doe")
    expect(list).toHaveTextContent("Date of birth: 01-01-2000")
    expect(list).toHaveTextContent("Postcode: XY9 8ZZ")
  })

  it("renders details list without optional fields if not provided", () => {
    renderWithRouter({lastName: "Smith", dob: "15-03-1995"})

    const list = screen.getByTestId("too-many-results-details-list")
    expect(list).not.toHaveTextContent("First name")
    expect(list).toHaveTextContent("Last name: Smith")
    expect(list).toHaveTextContent("Date of birth: 15-03-1995")
    expect(list).not.toHaveTextContent("Postcode")
  })

  it("renders retry and alternative search links", () => {
    renderWithRouter({lastName: "Smith", dob: "15-03-1995"})

    expect(screen.getByText(STRINGS.retryLinkText)).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)
    expect(screen.getByText(STRINGS.nhsNumberLinkText)).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)
    expect(screen.getByText(STRINGS.prescriptionIdLinkText))
      .toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })

  it("renders go back link", () => {
    renderWithRouter({lastName: "Smith", dob: "15-03-1995"})
    expect(screen.getByTestId("too-many-results-back-link"))
      .toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)
    expect(screen.getByTestId("go-back-link")).toHaveTextContent(STRINGS.goBackLink)
  })
})
