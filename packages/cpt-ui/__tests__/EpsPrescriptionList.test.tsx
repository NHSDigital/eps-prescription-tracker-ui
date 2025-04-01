import React from "react"
import {MemoryRouter, Route, Routes} from "react-router-dom"

import {render, screen, waitFor} from "@testing-library/react"
import "@testing-library/jest-dom"

import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

import {PrescriptionStatus, SearchResponse, TreatmentType} from "@cpt-ui-common/common-types"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"

import axios from "@/helpers/axios"
jest.mock("@/helpers/axios")

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>

import PrescriptionListPage from "@/pages/PrescriptionListPage"

const mockSearchResponse: SearchResponse = {
  patient: {
    nhsNumber: "5900009890",
    prefix: "Mr",
    suffix: "",
    given: "William",
    family: "Wolderton",
    gender: "male",
    dateOfBirth: "01-Nov-1988",
    address: {
      line1: "55 OAK STREET",
      line2: "OAK LANE",
      city: "Leeds",
      postcode: "LS1 1XX"
    }
  },
  currentPrescriptions: [
    {
      prescriptionId: "RX001",
      statusCode: PrescriptionStatus.TO_BE_DISPENSED,
      issueDate: "2025-03-01",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "RX002",
      statusCode: PrescriptionStatus.WITH_DISPENSER,
      issueDate: "2025-02-15",
      prescriptionTreatmentType: TreatmentType.ACUTE,
      issueNumber: 2,
      maxRepeats: 3,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "RX003",
      statusCode: PrescriptionStatus.WITH_DISPENSER_ACTIVE,
      issueDate: "2025-03-10",
      prescriptionTreatmentType: TreatmentType.ERD,
      issueNumber: 3,
      maxRepeats: 4,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: true
    }
  ],
  pastPrescriptions: [
    {
      prescriptionId: "RX004",
      statusCode: PrescriptionStatus.DISPENSED,
      issueDate: "2025-01-15",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 2,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "RX005",
      statusCode: PrescriptionStatus.NOT_DISPENSED,
      issueDate: "2024-12-20",
      prescriptionTreatmentType: TreatmentType.ACUTE,
      issueNumber: 1,
      maxRepeats: 1,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }
  ],
  futurePrescriptions: [
    {
      prescriptionId: "RX006",
      statusCode: PrescriptionStatus.FUTURE_DATED_PRESCRIPTION,
      issueDate: "2025-04-01",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 10,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }
  ]
}

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
          <Route path="*" element={<Dummy404 />} />
          <Route path={FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND} element={<Dummy404 />} />
          <Route path={FRONTEND_PATHS.PRESCRIPTION_LIST} element={<PrescriptionListPage />} />
        </Routes>
      </MemoryRouter>
    </MockPatientDetailsProvider>
  )
}

describe("PrescriptionListPage", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("renders the component with the correct title and heading", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?prescriptionId=C0C757-A83008-C2D93O")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

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
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?prescriptionId=C0C757-A83008-C2D93O")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const resultsCount = screen.getByTestId("results-count")
      expect(resultsCount).toHaveTextContent(
        `${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}6${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}`
      )
    })
  })

  it("redirects to the no prescription found page when no query parameters are present", async () => {
    mockedAxios.get.mockResolvedValue({
      // No content, but it just has to not be 200 to trigger
      status: 204,
      data: {}
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST)
    expect(mockedAxios.get).not.toHaveBeenCalled()

    await waitFor(() => {
      const dummyTag = screen.getByTestId("dummy-no-prescription-page")
      expect(dummyTag).toBeInTheDocument()
    })
  })

  it("sets the back link to the prescription ID search when prescriptionId query parameter is present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })

    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?prescriptionId=ABC123-A83008-C2D93O")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    // We need to wait for the useEffect to run
    await waitFor(() => {
      const linkContainer = screen.getByTestId("back-link-container")
      expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET)
    })
  })

  it("sets the back link to the NHS number search when nhsNumber query parameter is present", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockSearchResponse
    })
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?nhsNumber=1234567890")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    // We need to wait for the useEffect to run
    await waitFor(() => {
      const linkContainer = screen.getByTestId("back-link-container")
      expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET)
    })
  })

  it("navigates back to the prescription ID search when prescriptionId query fails", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 204,
      data: {}
    })
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?prescriptionId=ABC123-ABC123-ABC123")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const dummyTag = screen.getByTestId("dummy-no-prescription-page")
      expect(dummyTag).toBeInTheDocument()
    })
  })

  it("navigates back to the NHS number search when nhsNumber query fails", async () => {
    mockedAxios.get.mockResolvedValue({
      status: 204,
      data: {}
    })
    renderWithRouter(FRONTEND_PATHS.PRESCRIPTION_LIST + "?nhsNumber=32165649870")
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const dummyTag = screen.getByTestId("dummy-no-prescription-page")
      expect(dummyTag).toBeInTheDocument()
    })
  })

})
