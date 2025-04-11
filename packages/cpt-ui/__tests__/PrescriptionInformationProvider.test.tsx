import React from "react"
import {
  render,
  screen,
  fireEvent,
  waitFor
} from "@testing-library/react"
import {MemoryRouter, useNavigate, Link} from "react-router-dom"

import {mockPrescriptionDetailsResponse} from "../__mocks__/MockPrescriptionDetailsResponse"

import {PrescriptionInformationProvider, usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"

describe("PrescriptionInformationContext", () => {
  it("throws an error when usePrescriptionInformation is used outside the provider", () => {
    const Dummy = () => {
      usePrescriptionInformation()
      return <div>dummy</div>
    }

    expect(() => render(<Dummy />)).toThrow(
      "usePrescriptionInformation must be used within a PrescriptionInformationProvider"
    )
  })

  it("provides default context values", () => {
    const Dummy = () => {
      const {prescriptionInformation} = usePrescriptionInformation()
      return (
        <div data-testid="prescription-info">
          {prescriptionInformation ? "exists" : "none"}
        </div>
      )
    }

    render(
      <MemoryRouter>
        <PrescriptionInformationProvider>
          <Dummy />
        </PrescriptionInformationProvider>
      </MemoryRouter>
    )

    expect(screen.getByTestId("prescription-info").textContent).toBe("none")
  })

  it("setPrescriptionInformation updates the context", () => {
    const Dummy = () => {
      const {prescriptionInformation, setPrescriptionInformation} =
        usePrescriptionInformation()

      const setData = {
        ...mockPrescriptionDetailsResponse,
        prescriptionID: "123",
        issueDate: "2024-01-01",
        statusCode: "Pending",
        typeCode: "Acute"
      }

      return (
        <div>
          <div data-testid="prescription-info">
            {prescriptionInformation ? prescriptionInformation.prescriptionID : "none"}
          </div>
          <button
            onClick={() =>
              setPrescriptionInformation(setData)
            }
          >
            Set Info
          </button>
        </div>
      )
    }

    render(
      <MemoryRouter>
        <PrescriptionInformationProvider>
          <Dummy />
        </PrescriptionInformationProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Set Info"))
    expect(screen.getByTestId("prescription-info").textContent).toBe("123")
  })

  it("clear resets prescriptionInformation", () => {
    const Dummy = () => {
      const {prescriptionInformation, setPrescriptionInformation, clear} =
        usePrescriptionInformation()

      const setData = {
        ...mockPrescriptionDetailsResponse,
        prescriptionID: "456",
        issueDate: "2024-02-02",
        statusCode: "Dispensed",
        typeCode: "Repeat"
      }

      return (
        <div>
          <div data-testid="prescription-info">
            {prescriptionInformation ? prescriptionInformation.prescriptionID : "none"}
          </div>
          <button
            onClick={() =>
              setPrescriptionInformation(setData)
            }
          >
            Set Info
          </button>
          <button onClick={clear}>Clear</button>
        </div>
      )
    }

    render(
      <MemoryRouter>
        <PrescriptionInformationProvider>
          <Dummy />
        </PrescriptionInformationProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Set Info"))
    expect(screen.getByTestId("prescription-info").textContent).toBe("456")

    fireEvent.click(screen.getByText("Clear"))
    expect(screen.getByTestId("prescription-info").textContent).toBe("none")
  })

  it("clears context when navigating to a disallowed path", async () => {
    const Dummy = () => {
      const navigate = useNavigate()
      const {prescriptionInformation, setPrescriptionInformation} =
        usePrescriptionInformation()

      const setData = {
        ...mockPrescriptionDetailsResponse,
        prescriptionID: "789",
        issueDate: "2024-03-03",
        statusCode: "With Dispenser",
        typeCode: "eRD"
      }

      return (
        <div>
          <div data-testid="prescription-info">
            {prescriptionInformation ? prescriptionInformation.prescriptionID : "none"}
          </div>
          <button
            onClick={() =>
              setPrescriptionInformation(setData)
            }
          >
            Set Info
          </button>
          <button onClick={() => navigate("/not-allowed")} data-testid="nav-away" />
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={["/site/prescription-details"]}>
        <PrescriptionInformationProvider>
          <Dummy />
        </PrescriptionInformationProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Set Info"))
    expect(screen.getByTestId("prescription-info").textContent).toBe("789")

    fireEvent.click(screen.getByTestId("nav-away"))

    await waitFor(() => {
      expect(screen.getByTestId("prescription-info").textContent).toBe("none")
    })
  })

  it("does not clear context when remaining on an allowed path", () => {
    const Dummy = () => {
      const {prescriptionInformation, setPrescriptionInformation} =
        usePrescriptionInformation()

      const setData = {
        ...mockPrescriptionDetailsResponse,
        prescriptionID: "999",
        issueDate: "2024-04-04",
        statusCode: "Pending",
        typeCode: "Repeat"
      }

      return (
        <div>
          <div data-testid="prescription-info">
            {prescriptionInformation ? prescriptionInformation.prescriptionID : "none"}
          </div>
          <button
            onClick={() =>
              setPrescriptionInformation(setData)
            }
          >
            Set Info
          </button>
          <Link data-testid="link-same-page" to="/site/prescription-details" />
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={["/site/prescription-details"]}>
        <PrescriptionInformationProvider>
          <Dummy />
        </PrescriptionInformationProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Set Info"))
    expect(screen.getByTestId("prescription-info").textContent).toBe("999")

    fireEvent.click(screen.getByTestId("link-same-page"))
    expect(screen.getByTestId("prescription-info").textContent).toBe("999")
  })
})
