import React from "react"
import {useNavigate, useSearchParams} from "react-router-dom"

import {render, screen, waitFor} from "@testing-library/react"

import {AuthContext} from "@/context/AuthProvider"

import {FRONTEND_PATHS} from "@/constants/environment"

import http from "@/helpers/axios"

import PrescriptionDetailsPage from "@/pages/PrescriptionDetailsPage"
import {
  PrescriptionDetailsResponse,
  PrescriberOrganisationSummary,
  OrganisationSummary
} from "@cpt-ui-common/common-types/src/prescriptionDetails"

// Mock the axios instance.
jest.mock("@/helpers/axios", () => ({
  get: jest.fn()
}))

// Mock the react-router-dom hooks.
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useNavigate: jest.fn(),
    useSearchParams: jest.fn()
  }
})

// Mock the spinner component.
jest.mock("@/components/EpsSpinner", () => () => (
  <div data-testid="eps-spinner">Spinner</div>
))

type SiteDetailsCardsProps = {
  prescriber: PrescriberOrganisationSummary
  dispenser?: OrganisationSummary
  nominatedDispenser?: OrganisationSummary
}

// Create a simple mock for SiteDetailsCards so we can inspect the props.
jest.mock("@/components/SiteDetailsCards", () => ({

  SiteDetailsCards: (props: SiteDetailsCardsProps) => {
    return (
      <div data-testid="site-details-cards">
        {JSON.stringify(props)}
      </div>
    )
  }
}))

// --- Test Suite ---

describe("PrescriptionDetailsPage", () => {
  const mockNavigate = jest.fn()
  const fakeAuth = {idToken: "fakeToken"}

  beforeEach(() => {
    mockNavigate.mockClear();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate)
  })

  // Helper to render the component with a given query string.
  function renderComponent(searchParamString: string = "") {
    (useSearchParams as jest.Mock).mockReturnValue([new URLSearchParams(searchParamString)])
    return render(
      <AuthContext.Provider value={fakeAuth}>
        <PrescriptionDetailsPage />
      </AuthContext.Provider>
    )
  }

  it("renders spinner while loading", async () => {
    // For this test, simulate a pending HTTP request.
    (http.get as jest.Mock).mockImplementation(() => new Promise(() => {}))
    renderComponent("prescriptionId=C0C757-A83008-C2D93O")

    expect(screen.getByTestId("eps-spinner")).toBeInTheDocument()
  })

  it("navigates to prescription not found when prescriptionId is missing", async () => {
    renderComponent("") // No query string

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
    })
  })

  // FIXME: REMOVE THIS WHEN THE MOCK DATA IS PULL OUT!!!
  it("renders SiteDetailsCards with mock data on known prescriptionId (C0C757-A83008-C2D93O)", async () => {
    // Simulate a failure in the HTTP call so that the catch block is executed.
    (http.get as jest.Mock).mockRejectedValue(new Error("HTTP error"))

    renderComponent("prescriptionId=C0C757-A83008-C2D93O")

    // Wait for the async useEffect to update the UI.
    await waitFor(() => {
      expect(screen.getByTestId("site-details-cards")).toBeInTheDocument()
    })

    const cards = screen.getByTestId("site-details-cards")
    const props = JSON.parse(cards.textContent || "{}")

    // These are the hardcoded mock values defined on the component file.
    expect(props.prescriber).toEqual({
      name: "Fiji surgery",
      odsCode: "FI05964",
      address: "90 YARROW LANE, FINNSBURY, E45 T46",
      telephone: "01232 231321",
      prescribedFrom: "England"
    })
    expect(props.dispenser).toEqual({
      name: "Cohens chemist",
      odsCode: "FV519",
      address: "22 RUE LANE, CHISWICK, KT19 D12",
      telephone: "01943 863158"
    })
    expect(props.nominatedDispenser).toEqual({
      name: "Cohens chemist",
      odsCode: "FV519",
      address: "22 RUE LANE, CHISWICK, KT19 D12",
      telephone: "01943 863158"
    })
  })

  it("navigates to prescription not found on unknown prescriptionId", async () => {
    (http.get as jest.Mock).mockRejectedValue(new Error("HTTP error"))

    renderComponent("prescriptionId=UNKNOWN_ID")

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
    })
  })

  it("renders SiteDetailsCards with correct data for a successful HTTP GET response", async () => {
    // Define a payload that satisfies the PrescriptionDetailsResponse interface.
    const payload: PrescriptionDetailsResponse = {
      patientDetails: {
        identifier: "123",
        name: {given: "John", family: "Doe"},
        gender: "male",
        birthDate: "1980-01-01",
        address: {
          text: "Some address",
          line: "123 Street",
          city: "City",
          district: "District",
          postalCode: "LS11TW",
          type: "home",
          use: "primary"
        }
      },
      prescriptionID: "SUCCESS_ID",
      typeCode: "type",
      statusCode: "status",
      issueDate: "2020-01-01",
      instanceNumber: 1,
      maxRepeats: 0,
      daysSupply: "30",
      prescriptionPendingCancellation: false,
      prescribedItems: [],
      dispensedItems: [],
      messageHistory: [],
      prescriberOrganisation: {
        organisationSummaryObjective: {
          name: "Fiji surgery",
          odsCode: "FI05964",
          address: "90 YARROW LANE, FINNSBURY, E45 T46",
          telephone: "01232 231321",
          prescribedFrom: "England"
        }
      },
      nominatedDispenser: {
        organisationSummaryObjective: {
          name: "Some Nominated Dispenser",
          odsCode: "NOM123",
          address: "Nominated Address",
          telephone: "1234567890"
        }
      },
      currentDispenser: [{
        organisationSummaryObjective: {
          name: "Cohens chemist",
          odsCode: "FV519",
          address: "22 RUE LANE, CHISWICK, KT19 D12",
          telephone: "01943 863158"
        }
      }]
    };

    // Simulate a successful HTTP GET.
    (http.get as jest.Mock).mockResolvedValue({status: 200, data: payload})

    renderComponent("prescriptionId=SUCCESS_ID")

    await waitFor(() => {
      expect(screen.getByTestId("site-details-cards")).toBeInTheDocument()
    })

    const cards = screen.getByTestId("site-details-cards")
    const props = JSON.parse(cards.textContent || "{}")

    expect(props.prescriber).toEqual(payload.prescriberOrganisation.organisationSummaryObjective)
    expect(props.dispenser).toEqual(payload.currentDispenser[0].organisationSummaryObjective)
    expect(props.nominatedDispenser).toEqual(payload.nominatedDispenser.organisationSummaryObjective)
  })
})
