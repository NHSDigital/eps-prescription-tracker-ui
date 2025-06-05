import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"
import React from "react"

import PatientNotFoundMessage from "@/components/PatientNotFoundMessage"
import {STRINGS} from "@/constants/ui-strings/PatientNotFoundMessageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

const DummyPage = ({label}: {label: string}) => <div data-testid="dummy-page">{label}</div>

function setupRouter(
  search = "?firstName=Zoe&lastName=Zero&dobDay=31&dobMonth=12&dobYear=2021&postcode=AB1%202CD"
) {
  render(
    <MemoryRouter initialEntries={["/not-found" + search]}>
      <Routes>
        <Route path="/not-found" element={<PatientNotFoundMessage search={search} />} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS} element={<DummyPage label="Basic Details Search" />} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER} element={<DummyPage label="NHS Number Search" />} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID} element={<DummyPage label="Prescription ID Search" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("PatientNotFoundMessage", () => {
  it("renders the main heading and static content", () => {
    setupRouter()
    expect(screen.getByTestId("patient-not-found-heading")).toHaveTextContent(STRINGS.heading)
    expect(screen.getByTestId("query-summary")).toHaveTextContent(STRINGS.retryMessage)
    expect(screen.getByTestId("query-summary")).toHaveTextContent(STRINGS.intro)
    expect(screen.getByTestId("query-summary")).toHaveTextContent(STRINGS.alternativeSearch)
  })

  it("renders the go-back link with search query, and navigates to Basic Details Search", () => {
    const search = "?firstName=Zoe&lastName=Zero&dobDay=31&dobMonth=12&dobYear=2021&postcode=AB1%202CD"
    setupRouter(search)
    const backLink = screen.getByTestId("go-back-link")
    expect(backLink).toHaveAttribute(
      "href",
      FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS + search
    )
    fireEvent.click(backLink)
    expect(screen.getByTestId("dummy-page")).toHaveTextContent("Basic Details Search")
  })

  it("navigates to NHS Number Search when alternate link is clicked", () => {
    setupRouter()
    const nhsNumberLink = screen.getByTestId("patient-not-found-nhs-number-link")
    expect(nhsNumberLink).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)
    fireEvent.click(nhsNumberLink)
    expect(screen.getByTestId("dummy-page")).toHaveTextContent("NHS Number Search")
  })

  it("navigates to Prescription ID Search when alternate link is clicked", () => {
    setupRouter()
    const prescriptionIdLink = screen.getByTestId("patient-not-found-prescription-id-link")
    expect(prescriptionIdLink).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    fireEvent.click(prescriptionIdLink)
    expect(screen.getByTestId("dummy-page")).toHaveTextContent("Prescription ID Search")
  })

  it("renders correctly even with empty or no search parameter", () => {
    setupRouter("") // Empty search
    const backLink = screen.getByTestId("go-back-link")
    expect(backLink).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)
    fireEvent.click(backLink)
    expect(screen.getByTestId("dummy-page")).toHaveTextContent("Basic Details Search")
  })
})
