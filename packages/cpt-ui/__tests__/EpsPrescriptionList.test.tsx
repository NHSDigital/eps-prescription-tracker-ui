import React from "react"
import {MemoryRouter, Route, Routes} from "react-router-dom"

import {render, screen, waitFor} from "@testing-library/react"
import "@testing-library/jest-dom"

import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import PrescriptionListPage from "@/pages/PrescriptionListPage"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"

function Dummy404() {
  return (
    <main>
      <div>
        <p data-testid="dummy-no-prescription-page">Dummy page</p>
      </div>
    </main>
  )
}

const renderWithRouter = (route: string) => {
  return render(
    <MockPatientDetailsProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND} element={<Dummy404 />} />
          <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST} element={<PrescriptionListPage />} />
        </Routes>
      </MemoryRouter>
    </MockPatientDetailsProvider>
  )
}

describe("PrescriptionListPage", () => {
  it("renders the component with the correct title and heading", async () => {
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?prescriptionId=C0C757-A83008-C2D93O")

    await waitFor(() => {
      const heading = screen.getByTestId("prescription-list-heading")
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent(PRESCRIPTION_LIST_PAGE_STRINGS.HEADING)

      const resultsHeading = screen.getByTestId("results-heading")
      expect(resultsHeading).toBeInTheDocument()

      // Check that the component renders the prescription results list container
      const resultsListContainer = screen.getByTestId("prescription-results-list")
      expect(resultsListContainer).toBeInTheDocument()
    })
  })

  it("shows the correct number of results", async () => {
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?prescriptionId=C0C757-A83008-C2D93O")

    await waitFor(() => {
      const resultsCount = screen.getByTestId("results-count")
      expect(resultsCount).toHaveTextContent(
        `${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}5${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}`
      )
    })
  })

  it("redirects to the no prescription found page when no query parameters are present", async () => {
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST)

    await waitFor(() => {
      const dummyTag = screen.getByTestId("dummy-no-prescription-page")
      expect(dummyTag).toBeInTheDocument()
    })
  })

  it("sets the back link to the prescription ID search when prescriptionId query parameter is present", async () => {
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?prescriptionId=C0C757-A83008-C2D93O")

    // We need to wait for the useEffect to run
    await waitFor(() => {
      const linkContainer = screen.getByTestId("go-back-link")
      expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET)
    })
  })

  it("sets the back link to the NHS number search when nhsNumber query parameter is present", async () => {
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?nhsNumber=1234567890")

    // We need to wait for the useEffect to run
    await waitFor(() => {
      const linkContainer = screen.getByTestId("go-back-link")
      expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET)
    })
  })

})
