import React from "react"
import {MemoryRouter, Route, Routes} from "react-router-dom"

import {render, screen, waitFor} from "@testing-library/react"
import "@testing-library/jest-dom"

import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"

import PrescriptionListPage from "@/pages/PrescriptionListPage"

const renderWithRouter = async (route: string) => {
  return render(
    <MockPatientDetailsProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="*" element={<PrescriptionListPage />} />
        </Routes>
      </MemoryRouter>
    </MockPatientDetailsProvider>
  )
}

describe("PrescriptionListPage", () => {
  it("renders the component with the correct title and heading", async () => {
    await renderWithRouter("/prescription-results")

    const heading = screen.getByTestId("prescription-list-heading")
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(PRESCRIPTION_LIST_PAGE_STRINGS.HEADING)

    const resultsHeading = screen.getByTestId("results-heading")
    expect(resultsHeading).toBeInTheDocument()

    // Check that the component renders the prescription results list container
    const resultsListContainer = screen.getByTestId("prescription-results-list")
    expect(resultsListContainer).toBeInTheDocument()
  })

  it("shows the correct number of results", async () => {
    await renderWithRouter("/prescription-results")

    const resultsCount = screen.getByTestId("results-count")
    expect(resultsCount).toHaveTextContent(
      `${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}5${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}`
    )
  })

  it("sets the back link to the default target when no query parameters are present", async () => {
    await renderWithRouter("/prescription-results")

    // Now checking the link-container which has the href attribute
    const linkContainer = screen.getByTestId("back-link-container")
    expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET)
  })

  it("sets the back link to the prescription ID search when prescriptionId query parameter is present", async () => {
    await renderWithRouter("/prescription-results?prescriptionId=123456")

    // We need to wait for the useEffect to run
    await waitFor(() => {
      const linkContainer = screen.getByTestId("back-link-container")
      expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET)
    })
  })

  it("sets the back link to the NHS number search when nhsNumber query parameter is present", async () => {
    await renderWithRouter("/prescription-results?nhsNumber=1234567890")

    // We need to wait for the useEffect to run
    await waitFor(() => {
      const linkContainer = screen.getByTestId("back-link-container")
      expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET)
    })
  })

})
