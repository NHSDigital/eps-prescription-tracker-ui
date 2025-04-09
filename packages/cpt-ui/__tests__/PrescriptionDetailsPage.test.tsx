import React from "react"
import {MemoryRouter, Route, Routes} from "react-router-dom"
import {render, screen, waitFor} from "@testing-library/react"
import "@testing-library/jest-dom"

import PrescriptionDetailsPage from "@/pages/PrescriptionDetailsPage"
import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"
import {MockPrescriptionInformationProvider} from "../__mocks__/MockPrescriptionInformationProvider"

import {PRESCRIPTION_DETAILS_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

function renderWithRoute(prescriptionId?: string) {
  const initialRoute = `/site/prescription-details${prescriptionId ? `?prescriptionId=${prescriptionId}` : ""}`

  return render(
    <MockPatientDetailsProvider>
      <MockPrescriptionInformationProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/site/prescription-details" element={<PrescriptionDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </MockPrescriptionInformationProvider>
    </MockPatientDetailsProvider>
  )
}

describe("PrescriptionDetailsPage", () => {
  beforeEach(() => {
    delete window.__mockedPatientDetails
    delete window.__mockedPrescriptionInformation
  })

  it("displays loading message and spinner while fetching data", async () => {
    renderWithRoute("EC5ACF-A83008-733FD3")

    // Check that the loading message is rendered
    const loadingHeading = screen.getByRole("heading", {
      name: PRESCRIPTION_DETAILS_PAGE_STRINGS.LOADING_FULL_PRESCRIPTION
    })
    expect(loadingHeading).toBeInTheDocument()

    // Check that the spinner is rendered
    const spinner = screen.getByTestId("spinner")
    expect(spinner).toBeInTheDocument()

    // Wait for loading to finish and spinner to disappear
    await waitFor(() => {
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument()
    })
  })

  it("renders the page with heading", () => {
    renderWithRoute()
    expect(screen.getByRole("heading", {name: "Prescription details"})).toBeInTheDocument()
  })

  it("sets context for acute prescription", async () => {
    renderWithRoute("C0C757-A83008-C2D93O")

    await waitFor(() => {
      expect(window.__mockedPrescriptionInformation).toEqual({
        id: "C0C757-A83008-C2D93O",
        issueDate: "18-Jan-2024",
        status: "All items dispensed",
        type: "Acute",
        isERD: false,
        instanceNumber: undefined,
        maxRepeats: undefined,
        daysSupply: undefined
      })

      expect(window.__mockedPatientDetails).toEqual({
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
      })
    })
  })

  it("sets context for eRD prescription", async () => {
    renderWithRoute("EC5ACF-A83008-733FD3")

    await waitFor(() => {
      expect(window.__mockedPrescriptionInformation).toEqual({
        id: "EC5ACF-A83008-733FD3",
        issueDate: "22-Jan-2025",
        status: "All items dispensed",
        type: "eRD",
        isERD: true,
        instanceNumber: 2,
        maxRepeats: 6,
        daysSupply: 28
      })

      expect(window.__mockedPatientDetails).toEqual({
        nhsNumber: "5900009890",
        prefix: "Ms",
        suffix: "",
        given: "Janet",
        family: "Piper",
        gender: null,
        dateOfBirth: null,
        address: null
      })
    })
  })

  it("does not set context if no prescriptionId is provided", () => {
    renderWithRoute()
    expect(window.__mockedPrescriptionInformation).toBeUndefined()
    expect(window.__mockedPatientDetails).toBeUndefined()
  })
})
